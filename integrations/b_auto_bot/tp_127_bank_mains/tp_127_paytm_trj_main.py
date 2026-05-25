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
import  pytz
import tp_settings_2_0
import random
import trustpay_curl_2_0
from decimal import Decimal


# Define the time range (start and end time)
start_time = time(0, 30)  # 9:00 A
end_time = time(5, 0)   # 5:00 PM

net_timeout_start = time(5, 4)
net_timeout_end = time(5, 6)

# Website URL
url = tp_settings_2_0.PAYTM[('url')]
driver = webdriver.Chrome()
last_TRANSACTION_ID = ''
amt_index = -1
balance_limit = 50000
minimum_balance = 15000
gap_range = 999
last_payment_time = tim.time()
steady_time = 600
bank_name = ''
engine = pyttsx3.init()

def say(text):
    pass
    engine.say(text)
    engine.runAndWait()

def generate_random_number(s, e):
    return random.randint(s, e)

def login():
    driver.get("https://business.paytm.com")
    driver.maximize_window()
    input("login maully")
    driver.switch_to.window(driver.window_handles[-1])


def navigate_to_transactions():
    global driver

    tim.sleep(generate_random_number(1, 10))
    # Wait for the Transactions link to be clickable
    # Wait until the "Payments" accordion button is visible and clickable
    payments_btn = WebDriverWait(driver, 20).until(
        EC.element_to_be_clickable((By.XPATH, "//a[.//label[normalize-space()='Payments']]"))
    )
    # Click it
    payments_btn.click()

def execute_change(entry):
    global bank_name
    global last_TRANSACTION_ID
    global last_payment_time
    User_id = tp_settings_2_0.PAYTM[bank_name]
    bank_id = User_id['bank_id']
    comp = User_id['company']
    api = User_id['api']

    current_TRANSACTION_ID ,utr, code, amt, entry_type,TRANSACTION_ID = get_entry_details(entry)

    if entry_type == 'credit':
        last_payment_time = tim.time()
        print('change detected', entry)
        trustpay_curl_2_0.hit_curl(amt, code, utr, bank_name, bank_id, 'false', comp, api)

    else:
        print('no change')

    print('UPI CODE', code)
    print('TRANSACTION ID', current_TRANSACTION_ID)
    print('UTR', utr)
    print('AMT', amt)

    threading.Thread(target=tp_telegram_bot_2_0.send_bank_pending_group, args=(entry,)).start()
    threading.Thread(target=tp_telegram_bot_2_0.send_last_utr_PAYTM, args=(bank_name, current_TRANSACTION_ID,utr,code)).start()

    last_TRANSACTION_ID = current_TRANSACTION_ID


def get_entry_details(entry):
    utr = ''
    code = ''
    amt = ''
    entry_type = ''
    current_TRANSACTION_ID = ''
    TRANSACTION_ID = ''
    is_pending = False

    transaction_type = get_transaction_type(entry)
    if transaction_type == 'IMPS':
        utr, code, amt, entry_type, is_pending,TRANSACTION_ID = get_imps_utr(entry)
    elif transaction_type == 'NEFT':
        utr, code, amt, entry_type, is_pending,TRANSACTION_ID = get_neft_utr(entry)
    elif transaction_type == 'UPI':
        current_TRANSACTION_ID ,utr, code, amt, entry_type,TRANSACTION_ID = get_upi_utr(entry)

    return current_TRANSACTION_ID ,utr, code, amt, entry_type,TRANSACTION_ID

def get_transaction_type(entry):

   if 'IMPS' in entry or 'Return-IMPS' in entry:
       return 'IMPS'
   elif 'NEFT' in entry  or 'Return-NEFT' in entry :
       return 'NEFT'
   elif 'UPI' in entry or 'Return-UPI' in entry :
       return 'UPI'
   return 'UPI'

def get_imps_utr(entry):
    global amt_index
    utr = ''
    code = 'nil'
    amt = ''
    entry_type = ''
    is_pending = False
    last_TRANSACTION_ID = ''

    return utr, code, amt, entry_type, is_pending,last_TRANSACTION_ID

def get_neft_utr(entry):
    global amt_index
    utr = ''
    code = 'nil'
    amt = ''
    entry_type = ''
    is_pending = False
    last_TRANSACTION_ID = ''

    return utr, code, amt, entry_type, is_pending,last_TRANSACTION_ID

def get_upi_utr(entry):
    global amt_index
    utr = ''
    code = 'nil'
    amt = ''
    entry_type = ''
    is_pending = False
    current_TRANSACTION_ID = ''
    TRANSACTION_ID = ''

    entry_type = 'credit'
    current_TRANSACTION_ID = entry['Order Id']
    # TRANSACTION_ID = entry['TRANSACTION_ID']
    utr = entry['RRN']
    amt = entry['amount']
    code = entry['short_code']

    return current_TRANSACTION_ID ,utr, code, amt, entry_type ,TRANSACTION_ID

def refresh_last_ten_transactions():
    global bank_name

    tim.sleep(generate_random_number(1,10 ))
    home = WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((
            By.XPATH, "//a[.//label[normalize-space()='Home']]"
        ))
    )
    home.click()
    navigate_to_transactions()

def get_trans_list(last_TRANSACTION_ID):
    wait = WebDriverWait(driver, 20)
    tim.sleep(0.5)

    order_data = {}

    rows = driver.find_elements(By.CSS_SELECTOR, "tbody tr")
    # ---------------------------------
    # Find index of last_TRANSACTION_ID
    # ---------------------------------
    start_index = len(rows)  # default: start from bottom

    # extract last 4 digits from stored transaction id
    # last_digits = "".join(filter(str.isdigit, str(last_TRANSACTION_ID)))[-4:]

    for idx, row in enumerate(rows):
        try:
            oid = row.find_element(By.TAG_NAME, "label").text.strip()
            if oid == last_TRANSACTION_ID:
                start_index = idx + 1  # move UP
                break
        except Exception:
            continue

    for i in range(start_index):
        rows = driver.find_elements(By.CSS_SELECTOR, "tbody tr")
        row = rows[i]
        order_el = row.find_element(By.TAG_NAME, "label")
        # if not order_el.isdigit():
        # TRANSACTION_ID = row.find_element( By.XPATH, ".//label[starts-with(normalize-space(), '**')]").text.strip()
        order_id = order_el.text.strip()

        # -------------------------
        # STEP 1: Click order_id
        # -------------------------
        driver.execute_script(
            "arguments[0].scrollIntoView({block:'center'});", order_el
        )
        driver.execute_script("arguments[0].click();", order_el)

        # -------------------------
        # STEP 2: Extract RRN
        # -------------------------
        tim.sleep(0.5)
        rrn_el = wait.until(
            EC.presence_of_element_located((
                By.XPATH,
                "//li[.//label[contains(normalize-space(),'RRN')]]//p"
            ))
        )
        rrn = rrn_el.text.strip()
        if not rrn:
            tim.sleep(1)
            rrn_el = wait.until(
                EC.presence_of_element_located((
                    By.XPATH,
                    "//li[.//label[contains(normalize-space(),'RRN')]]//p"
                ))
            )
            rrn = rrn_el.text.strip()
        # -------------------------
        # STEP 3: Extract Payment Option
        # -------------------------
        payment_option = wait.until(
            EC.presence_of_element_located((
                By.XPATH,
                "//li[.//label[normalize-space()='Payment Option']]//p"
            ))
        ).text.strip()
        # -------------------------
        # STEP 4: Get Payment Amount
        # -------------------------
        amt_el = wait.until(
            EC.presence_of_element_located((
                By.XPATH,
                "//li[.//span[normalize-space()='Payment Amount']]//span[last()]"
            ))
        )

        amount_text = amt_el.text
        amount = Decimal(re.sub(r"[^\d.]", "", amount_text))
        # # --------- COMMENT / SHORT CODE ----------
        try:
            short_code = wait.until(
                EC.presence_of_element_located((
                    By.XPATH,
                    "//li[.//label[normalize-space()='Comment']]//span"
                ))
            ).text.strip()
        except:
            short_code = 'nil'

        if (
                not short_code
                or len(short_code) != 5
                or payment_option.lower() in short_code.lower()
        ):
            short_code = 'nil'
        # -------------------------
        # STEP 5: Click BACK arrow
        # -------------------------
        tim.sleep(0.5)
        back_btn = wait.until(
            EC.element_to_be_clickable((
                By.XPATH,
                "//div[@data-testid='return-cta']"
            ))
        )
        driver.execute_script("arguments[0].click();", back_btn)

        # -------------------------
        # STEP 6: Save to dict
        # -------------------------
        order_data[i] = {
            # "TRANSACTION_ID": TRANSACTION_ID,
            "Order Id": order_id,
            "RRN": rrn,
            "amount": amount,
            'UPI': payment_option,
            "short_code": short_code,
        }

        # print(f"{order_id} → RRN: {rrn}, Amount: {amount}")

        tim.sleep(0.5)

    return order_data

def main_loop(bank_id):
    global ping_flag
    global bank_name
    global amt_index
    global last_TRANSACTION_ID
    global last_payment_time
    bank_name = bank_id

    # say('Enter Last TRANSACTION ID')
    last_TRANSACTION_ID = input('Enter last TRANSACTION ID:')
    trans_list = []
    was_maintain = False
    last_payment_time = tim.time()
    while True:
        try:
            utc_now = datetime.utcnow()
            utc_datetime_now = datetime.utcnow()
            ist_timezone = pytz.timezone('Asia/Kolkata')
            ist_datetime_now = pytz.utc.localize(utc_datetime_now).astimezone(ist_timezone)
            ist_now = ist_datetime_now.time()

            if net_timeout_start <= ist_now <= net_timeout_end:
                print('internet timeout')
                continue

            if tim.time() - last_payment_time > steady_time:
                say(f'It has been {steady_time / 60} Minutes since last Payment in GOOGLE {bank_name} Please check')

            refresh_last_ten_transactions()
            order_data = get_trans_list(last_TRANSACTION_ID)
            if not order_data:
                tim.sleep(1)
                order_data = get_trans_list(last_TRANSACTION_ID)

            for index, (order_id, data) in enumerate(order_data.items()):
                break_flag = False
                current_TRANSACTION_ID, c, a, e, i,t = get_entry_details(data)
                if current_TRANSACTION_ID == last_TRANSACTION_ID:
                    index_to_check_till = index
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
               # say('More than 10 transactions')
                print('More than 10 transactions')

                bank = tp_settings_2_0.PAYTM[bank_name]
                main_loop(bank_id)
        except TypeError as e:
            # Handle the TypeError exception
            say('Exception Occurred Need Attention')
            print(f"TypeError occurred: {e}")

        except Exception as e:
            # Handle other types of exceptions
            say('Exception Occurred Need Attention')
            print(f"An error occurred: {e}")
