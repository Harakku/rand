from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import NoSuchElementException
from subprocess import CREATE_NO_WINDOW
from datetime import datetime

# SETTINGS
username = "user"
password = "pass"
num_of_videos_to_bump = 11
log_file_path = r".\bump_log.txt"
chromedriver_path = r".\chromedriver.exe"
chrome_path = r".\ungoogled-chromium-portable-win64\app\chrome.exe"

t = datetime.now()
with open(log_file_path, "a") as f:
    f.write("{} {}:{} results: ".format(t.date(), t.hour, t.minute))

service = Service(chromedriver_path)
service.creationflags = CREATE_NO_WINDOW
options = webdriver.ChromeOptions()
options.add_argument('headless')
options.add_argument("window-size=1920x1080")
options.add_argument("disable-gpu")
options.add_experimental_option('excludeSwitches', ['enable-logging'])
options.add_argument('--log-level 3')
options.binary_location = chrome_path
driver = webdriver.Chrome(service=service, options=options)
driver.maximize_window()

try:
    driver.get("https://domain.com/member.php?action=login")
    driver.find_element_by_xpath('//form[@id="login_form"]/input[1]').send_keys(username)
    driver.find_element_by_xpath('//form[@id="login_form"]/input[2]').send_keys(password)
    driver.find_element_by_xpath('//*[@id="login_form"]/div/input').click()
    driver.get("https://domain.com/bump-your-share.php")

    driver.implicitly_wait(10)
    urls = []
    for i in range(1, num_of_videos_to_bump + 1):
        link = driver.find_element_by_xpath('//*[@id="shares_on_prof"]/a[{0}]'.format(i)).get_attribute("href")
        urls.append(link)

    bump_count = 0
    driver.implicitly_wait(0)
    for link in urls:
        driver.get(link)
        if elements := driver.find_elements_by_xpath("//a[@title='Bump this thread']"):
            link = elements[0].get_attribute("href")
            driver.get(link)
            bump_count += 1

    link = driver.find_element_by_xpath("//a[contains(text(), 'Log Out')]").get_attribute("href")
    driver.get(link)
except NoSuchElementException:
    pass

with open(log_file_path, "a") as f:
    f.write("bumped {}/{} videos\n".format(bump_count, len(urls)))

driver.quit()
