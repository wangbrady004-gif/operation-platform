import threading
import time as tim
from datetime import datetime, time
import re
import pyttsx3
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import tp_telegram_bot_2_0
import pytz
import tp_settings_2_0
import random
import trustpay_curl_2_0
from decimal import Decimal


# Define the time range
start_time = time(0, 30)
end_time = time(5, 0)

net_timeout_start = time(5, 4)
net_timeout_end = time(5, 6)

driver = webdriver.Chrome()

last_CUSTOMER_NAME = ''
last_TRANSACTION_ID = ''
amt_index = -1
last_payment_time = tim.time()
steady_time = 600
bank_name = ''

engine = pyttsx3.init()

# ------------------ UTILS ------------------

def say(text):
    engine.say(text)
    engine.runAndWait()

def generate_random_number(s, e):
    return random.randint(s, e)

# ------------------ LOGIN ------------------

def login():
    driver.get("https://business.paytm.com")
    driver.maximize_window()
    input("login manually")
    driver.switch_to.window(driver.window_handles[-1])

def navigate_to_transactions():
    tim.sleep(generate_random_number(1, 10))
    payments_btn = WebDriverWait(driver, 20).until(
        EC.element_to_be_clickable(
            (By.XPATH, "//a[.//label[normalize-space()='Payments']]")
        )
    )
    payments_btn.click()

def refresh_last_ten_transactions():
    tim.sleep(generate_random_number(1, 10))
    home = WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable(
            (By.XPATH, "//a[.//label[normalize-space()='Home']]")
        )
    )
    home.click()
    navigate_to_transactions()

# ------------------ TRANSACTION FETCH ------------------

def get_trans_list(last_CUSTOMER_NAME, last_TRANSACTION_ID):
    wait = WebDriverWait(driver, 20)
    order_data = {}

    rows = wait.until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, "tbody tr"))
    )

    last_digits = "".join(filter(str.isdigit, str(last_TRANSACTION_ID)))[-4:]
    start_index = None

    for idx, row in enumerate(rows):
        try:
            labels = row.find_elements(By.TAG_NAME, "label")
            if not labels:
                continue

            customer_name = labels[0].text.strip()
            masked = row.find_elements(By.XPATH, ".//label[contains(text(),'**')]")
            if not masked:
                continue

            masked_digits = "".join(filter(str.isdigit, masked[0].text))

            if customer_name == last_CUSTOMER_NAME and masked_digits == last_digits:
                start_index = idx + 1
                break
        except:
            continue

    if start_index is None:
        start_index = 0

    for i in range(start_index, len(rows)):
        rows = driver.find_elements(By.CSS_SELECTOR, "tbody tr")
        row = rows[i]

        labels = row.find_elements(By.TAG_NAME, "label")
        if not labels:
            continue

        order_el = labels[0]
        order_id = order_el.text.strip()

        driver.execute_script(
            "arguments[0].scrollIntoView({block:'center'});", order_el
        )
        driver.execute_script("arguments[0].click();", order_el)

        try:
            TRANSACTION_ID = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((
                    By.XPATH,
                    "//li[.//label[contains(text(),'Transaction ID')]]//p"
                ))
            ).text.strip()
        except:
            TRANSACTION_ID = "unknown"

        rrn = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((
                By.XPATH,
                "//li[.//label[contains(text(),'RRN')]]//p"
            ))
        ).text.strip()

        payment_option = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((
                By.XPATH,
                "//li[.//label[normalize-space()='Payment Option']]//p"
            ))
        ).text.strip()

        amt_text = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((
                By.XPATH,
                "//li[.//span[normalize-space()='Payment Amount']]//span[last()]"
            ))
        ).text

        amount = Decimal(re.sub(r"[^\d.]", "", amt_text))

        try:
            short_code = WebDriverWait(driver, 5).until(
                EC.visibility_of_element_located((
                    By.XPATH,
                    "//li[.//label[normalize-space()='Comment']]//span"
                ))
            ).text.strip()
        except:
            short_code = 'nil'

        if not short_code or len(short_code) != 5:
            short_code = 'nil'

        back_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//div[@data-testid='return-cta']")
            )
        )
        driver.execute_script("arguments[0].click();", back_btn)

        order_data[i] = {
            "Order Id": order_id,
            "TRANSACTION_ID": TRANSACTION_ID,
            "RRN": rrn,
            "amount": amount,
            "UPI": payment_option,
            "short_code": short_code,
        }

    return order_data

# ------------------ ENTRY PARSER ------------------

def get_entry_details(entry):
    return (
        entry["Order Id"],
        entry["RRN"],
        entry["short_code"],
        entry["amount"],
        "credit",
        entry["TRANSACTION_ID"]
    )

# ------------------ EXECUTOR ------------------

def execute_change(entry):
    global last_CUSTOMER_NAME, last_TRANSACTION_ID, last_payment_time

    current_CUSTOMER_NAME, utr, code, amt, entry_type, TRANSACTION_ID = get_entry_details(entry)

    if entry_type == 'credit':
        last_payment_time = tim.time()
        cfg = tp_settings_2_0.PAYTM[bank_name]
        trustpay_curl_2_0.hit_curl(
            amt, code, utr, bank_name,
            cfg['bank_id'], 'false',
            cfg['company'], cfg['api']
        )

    threading.Thread(
        target=tp_telegram_bot_2_0.send_last_utr_PAYTM,
        args=(bank_name, current_CUSTOMER_NAME, utr, TRANSACTION_ID)
    ).start()

    last_CUSTOMER_NAME = current_CUSTOMER_NAME
    last_TRANSACTION_ID = TRANSACTION_ID

# ------------------ MAIN LOOP ------------------

def main_loop(bank_id):
    global bank_name, last_CUSTOMER_NAME, last_TRANSACTION_ID, last_payment_time

    bank_name = bank_id
    last_CUSTOMER_NAME = input('Enter last CUSTOMER NAME:').strip()
    last_TRANSACTION_ID = input('Enter last TRANSACTION ID:').strip()

    last_payment_time = tim.time()

    while True:
        try:
            ist_now = pytz.utc.localize(datetime.utcnow()).astimezone(
                pytz.timezone('Asia/Kolkata')
            ).time()

            if net_timeout_start <= ist_now <= net_timeout_end:
                continue

            if tim.time() - last_payment_time > steady_time:
                say('No payment detected recently')

            refresh_last_ten_transactions()
            order_data = get_trans_list(last_CUSTOMER_NAME, last_TRANSACTION_ID)

            if not order_data:
                continue

            items = list(order_data.items())
            last_digits = "".join(filter(str.isdigit, str(last_TRANSACTION_ID)))[-4:]

            for idx, (_, data) in enumerate(items):
                cname, _, _, _, _, txn_id = get_entry_details(data)
                txn_digits = "".join(filter(str.isdigit, txn_id))[-4:]
                if txn_digits == last_digits:
                    index_to_check_till = idx
                    if amt_index == -1:
                        if index_to_check_till == 0:
                            print("no change")
                            break
                        # 🔥 iterate BACKWARD from matched index
                        items = list(order_data.items())
                        for inner_index in range(index_to_check_till - 1, -1, -1):
                            prev_order_id, prev_data = items[inner_index]
                            execute_change(prev_data)
                    break
            else:
                say('More than 10 transactions')
                print('More than 10 transactions')

                bank = tp_settings_2_0.PAYTM[bank_name]
                main_loop(bank_id)

        except Exception as e:
            say('Exception occurred')
            print('ERROR:', e)
