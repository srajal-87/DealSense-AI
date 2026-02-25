from pydantic import BaseModel
from typing import List, Dict, Self
from bs4 import BeautifulSoup
from src.config.feeds import CATEGORY_FEEDS
import re
import logging
import feedparser
from tqdm import tqdm
import requests
import time

# Timeout for fetching a single deal page (seconds)
DEAL_PAGE_TIMEOUT = 15

def extract(html_snippet: str) -> str:
    """
    Use Beautiful Soup to clean up this HTML snippet and extract useful text
    """
    soup = BeautifulSoup(html_snippet, 'html.parser')
    snippet_div = soup.find('div', class_='snippet summary')
    
    if snippet_div:
        description = snippet_div.get_text(strip=True)
        description = BeautifulSoup(description, 'html.parser').get_text()
        description = re.sub('<[^<]+?>', '', description)
        result = description.strip()
    else:
        result = html_snippet
    return result.replace('\n', ' ')

class ScrapedDeal:
    """
    A class to represent a Deal retrieved from an RSS feed
    """
    category: str
    title: str
    summary: str
    url: str
    details: str
    features: str

    def __init__(self, entry: Dict[str, str]):
        """
        Populate this instance based on the provided dict.
        Uses timeout on request; safe fallback if content-section is missing.
        """
        self.title = entry.get("title", "")
        self.summary = extract(entry.get("summary", ""))
        self.url = entry["links"][0]["href"]
        try:
            resp = requests.get(self.url, timeout=DEAL_PAGE_TIMEOUT)
            resp.raise_for_status()
            stuff = resp.content
        except requests.RequestException as e:
            logging.warning("Failed to fetch deal page %s: %s", self.url, e)
            self.details = self.summary
            self.features = ""
            return
        soup = BeautifulSoup(stuff, "html.parser")
        content_div = soup.find("div", class_="content-section")
        if content_div is None:
            content = self.summary
        else:
            content = content_div.get_text(separator=" ", strip=True)
        content = content.replace("\nmore", "").replace("\n", " ")
        if "Features" in content:
            self.details, self.features = content.split("Features", 1)
        else:
            self.details = content
            self.features = ""

    def __repr__(self):
        """
        Return a string to describe this deal
        """
        return f"<{self.title}>"

    def describe(self):
        """
        Return a longer string to describe this deal for use in calling a model
        """
        return f"Title: {self.title}\nDetails: {self.details.strip()}\nFeatures: {self.features.strip()}\nURL: {self.url}"

    @classmethod
    def fetch(cls, show_progress: bool = False, selected_feeds: List[str] = None) -> List[Self]:
        """
        Retrieve all deals from the selected RSS feeds.
        If selected_feeds is None, fall back to all feeds in CATEGORY_FEEDS.
        Skips entries that fail to parse so one bad URL does not break the whole fetch.
        """
        deals = []
        feed_list = selected_feeds if selected_feeds else [list(CATEGORY_FEEDS.values())[0]]
        feed_iter = tqdm(feed_list) if show_progress else feed_list

        for feed_url in feed_iter:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:5]:
                try:
                    deals.append(cls(entry))
                except Exception as e:
                    logging.warning("Skipping deal entry due to error: %s", e)
                time.sleep(0.5)
        return deals

class Deal(BaseModel):
    """
    A class to Represent a Deal with a summary description
    """
    product_description: str
    price: float
    url: str

class DealSelection(BaseModel):
    """
    A class to Represent a list of Deals
    """
    deals: List[Deal]

class Opportunity(BaseModel):
    """
    A class to represent a possible opportunity: a Deal where we estimate
    it should cost more than it's being offered
    """
    deal: Deal
    estimate: float
    discount: float