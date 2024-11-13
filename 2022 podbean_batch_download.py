# SPDX-License-Identifier: MIT

# Podbean Batch Download v0.2.0
#
# Setup:
# pip install wget lxml requests
#
# Usage:
# python podbean_batch_download.py "https://www.podbean.com/podcast-detail/dr8qc-2f281/The-History-of-Byzantium-Podcast" [ROW_NUMBER]

from collections import OrderedDict
import os
import re
import sys
from time import sleep
from urllib.parse import urlparse

from lxml import html
import requests
import wget


def podbean_download(podcast_html, row_num=1):
    all_links = podcast_html.xpath('//table//a/@href')
    download_links = []

    for link in all_links:
        if link.startswith("https://www.podbean.com/site/EpisodeDownload/"):
            download_links.append(link)

    download_links = list(OrderedDict.fromkeys(download_links))  # dedupe

    for row, download_url in enumerate(download_links, start=1):
        if row < row_num:
            continue

        download_page = requests.get(download_url)
        download_page_html = html.fromstring(download_page.content)

        podcast_title = download_page_html.xpath('//div[@class="pod-title"]//a/text()')[0].strip()
        episode_title = download_page_html.xpath('//div[@class="pod-content"]//p[@class="pod-name"]/text()')[0].strip()
        episode_time = download_page_html.xpath(
            '//div[@class="pod-content"]//div[@class="time"]/span/text()')[0].strip()
        episode_download_link = download_page_html.xpath(
            '//div[@class="pod-content"]//div[@class="btn-group"]/a/@href')[0].strip()
        file_extension = os.path.splitext(urlparse(episode_download_link).path)[1]
        
        print(f'Ladataan jakso "{episode_title}".\n')
        filename = f"{podcast_title} - {episode_time} - {episode_title}{file_extension}"
        filename = re.sub(r'[\x00-\x1f\x7f\"\*\/\:\<\>\?\\\|]', '_', filename)
        wget.download(episode_download_link, filename)

        # podbean robots.txt doesn't have a defined crawl-delay so we're using something ethical here
        crawl_delay = 5
        print(f"\nDone. Nukutaan {crawl_delay} sekuntia.\n")
        sleep(crawl_delay)

if __name__ == "__main__":
    podcast_url = sys.argv[1]
    first_download_row = 1
    if len(sys.argv) >= 3:
        first_download_row = int(sys.argv[2])
    
    page = "0"
    while True:
        podcast_page = requests.get(podcast_url)
        podcast_html = html.fromstring(podcast_page.content)
        page = podcast_html.xpath('//div[@class="pagination"]//li[@class=" active"]/a/text()')[0].strip()

        print(f"Aloitetaan sivun {page} käsittely.\n")
        podbean_download(podcast_html, first_download_row)

        next_url_path = podcast_html.xpath('//div[@class="pagination"]//li[@class="next"]/a/@href')
        if not next_url_path:
            break
        else:
            next_url_path = next_url_path[0].strip()

        podcast_url_parsed = urlparse(podcast_url)
        podcast_url = f"{podcast_url_parsed.scheme}://{podcast_url_parsed.netloc}{next_url_path}"
        print("\n\n")

    print("Loppu.")
