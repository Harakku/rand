from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import NoSuchElementException
from subprocess import CREATE_NO_WINDOW
from datetime import datetime
import ctypes
import winsound
import time
from pathlib import Path
from zipfile import ZipFile
import traceback
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# SETTINGS
headless = False
event_urls_file = "event_links.txt"
chromium_zip_path = r".\chromium-setit.zip"
chromedriver_path = r".\chromedriver.exe"
chrome_path = r".\ungoogled-chromium-portable-win64\app\chrome.exe"
driver_timeout = 5

if not Path(chromedriver_path).exists() or not Path(chrome_path).exists():
    with ZipFile(chromium_zip_path, 'r') as chromium_zip:
        chromium_zip.extractall(".")

service = Service(chromedriver_path)
service.creationflags = CREATE_NO_WINDOW
options = webdriver.ChromeOptions()
options.add_argument("window-size=1920x1080")
options.add_argument("disable-gpu")
options.add_experimental_option('excludeSwitches', ['enable-logging'])
options.add_argument('--log-level 3')
options.binary_location = chrome_path
if headless:
    options.add_argument('headless')
driver = webdriver.Chrome(service=service, options=options)
#driver.maximize_window()

database = []
# Example entry:
#{
#    "event": "event-title 2021",
#    "season": "summer",
#    "sports": [],
#}


def main():
    driver.implicitly_wait(2)  # Makes it a bit more forgiving with element loads I think
    driver.get("https://domain.com/en/olympic-games")

    # Accept cookies or whatever
    accept_button = WebDriverWait(driver, driver_timeout).until(
        EC.presence_of_element_located((By.XPATH, '//*[@id="onetrust-accept-btn-handler"]'))
    )
    driver.execute_script("arguments[0].click();", accept_button)

    # GET EVENT URLS
    scroll_page(driver)

    more_events_button = WebDriverWait(driver, driver_timeout).until(
        EC.presence_of_element_located((By.XPATH, '//*[@id="olympic-all-games"]//div/button'))
    )
    while not driver.find_elements(
            By.XPATH, '//*[@id="olympic-all-games"]//a[@href="/en/olympic-games/athens-1896"]'):
        driver.execute_script("arguments[0].click();", more_events_button)
    
    event_urls = [
        event.get_attribute("href") + "/results"
        for event in driver.find_elements(By.XPATH, '//*[@id="olympic-all-games"]/section/div[1]/a')
    ]
    event_names = [
        event_p.text
        for event_p
        in driver.find_elements(By.XPATH, '//*[@id="olympic-all-games"]//a//p')
    ]

    # USE EVENT URLS TO FIND SPORTS URLS PER EVENT
    # Olympics events
    for i, event_url in enumerate(event_urls):
        database.append({
            "event": event_names[i],
            "event_url": event_url,
            "sports": []
        })

        driver.get(event_url)
        scroll_page(driver)

        sports = driver.find_elements(By.XPATH, '//*[@id="olympic-games-disciplines"]//a')
        sport_names = [sport.text for sport in sports]
        sport_urls = [sport.get_attribute("href") for sport in sports]
        
        for j, sport_url in enumerate(sport_urls):
            database[i]["sports"].append({
                "sport": sport_names[j],
                "sport_url": sport_url,
                "competitions": []
            })

            driver.get(sport_url)
            expand_button = driver.find_element(By.XPATH, '//*[@id="__next"]/section/section[4]/div[1]/button')
            driver.execute_script("arguments[0].click();", expand_button)

            competitions = driver.find_elements(By.XPATH, '//*[@id="__next"]/section/section[4]/div[2]//a')
            competition_names = [competition.text for competition in competitions]
            competition_urls = [competition.get_attribute("href") for competition in competitions]


            for k, competition_url in enumerate(competition_urls):
                database[i]["sports"][j]["competitions"].append({
                    "competition": competition_names[k],
                    "competition_url": competition_url,
                    "participants": []
                })

                driver.get(competition_url)

                participant_divs = driver.find_elements(
                    By.XPATH, '//*[@id="__next"]/section/section[4]/div/div/div[2]/div'
                )
                for index in range(1, len(participant_divs) // 2 + 1):
                    singleParticipant = driver.find_elements(
                        By.XPATH,
                        '//*[@id="__next"]//div[1]/div[3]/div'
                    )

                    if len(singleParticipant) > 1:
                        team = driver.find_elements(
                            By.XPATH,
                            '//*[@id="__next"]/section/section[4]/div/div/div[2]/div[{}]/div[2]//span'.format(index*2)
                        )
                        participant_name = driver.find_element(
                            By.XPATH,
                            '//*[@id="__next"]/section/section[4]/div/div/div[2]/div[{}]/div[3]//h3'.format(index*2)
                        )
                        participant_url = driver.find_elements(
                            By.XPATH,
                            '//*[@id="__next"]/section/section[4]/div/div/div[2]/div[{}]/div[3]/div/a'.format(index*2)
                        )
                    else:
                        team = driver.find_elements(
                            By.XPATH,
                            '//*[@id="__next"]/section/section[4]/div/div/div[2]/div[2]/div[3]/span[1]'.format(index*2)
                        )
                        participant_name = ""
                        participant_url = ""

                    if team:
                        team = team[0]
                    else:
                        team = ""
                    if participant_url:
                        participant_url = participant_url[0]
                    else:
                        participant_url = ""

                    rank = WebDriverWait(driver, driver_timeout).until(
                        EC.presence_of_element_located((
                            By.XPATH,
                            '//*[@id="__next"]/section/section[4]/div/div/div[2]/div[{}]/div[1]//span'.format(index*2)
                        ))
                    )

                    database[i]["sports"][j]["competitions"][k]["participants"].append({
                        "rank": rank,
                        "team": team,
                        "participant_name": participant_name,
                        "participant_url": participant_url
                    })



# temp stuff
                break
        break
    print(str(database))






def scroll_page(driver):
    """Scrolls from top to bottom and returns to top."""
    # Scroll to load wanted elements
    for i in reversed(range(20)):
        # TODO: make scrolling linear, not exponential and do not divide by zero at the end
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight / {});".format(i))
        time.sleep(0.1)

if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()

    input()
    driver.quit()
