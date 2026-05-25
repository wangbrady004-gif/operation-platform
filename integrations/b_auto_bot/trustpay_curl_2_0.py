import time as tim
import requests
import random
import tp_settings_2_0
# import tp_trustpay_bot

import requests
from loguru import logger

from pathlib import Path

# Define logs directory and file
log_dir = Path("logs")
log_dir.mkdir(parents=True, exist_ok=True)  # auto-create directory if not exist

log_file = log_dir / "app.log"

# Configure logger
logger.add(
    log_file,
    rotation="1 week",   # create new file every week
    level="INFO"         # log INFO and above
)
logger.info("This is an info message")
chat_id = -4539594824
bot_token = '7116070977:AAHvK3IiWF64kGdVVz3BlnX1cT_eCz-j9fU'
def send_telegram_message(amt, shor_code, utr, bank_name):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text":  f"/success {amt} {shor_code} {utr} {bank_name}"
    }
    print(payload["text"]);
    requests.post(url, json=payload)

def post_request_with_retry(url, data, headers, retry_delay=3):
    while True:
        try:
            response = requests.post(url, data, headers=headers)

            if response.status_code in [200 ,201,429]:
                logger.info("Request succeeded.")
                return response  # Return the successful response and all saved responses
            else:
                logger.warning(
                    f"Unexpected response code: {response.status_code}. Pausing for 2 seconds before retrying... {data}")
                response = requests.post(url, data, headers=headers)
                tim.sleep(2)
                logger.warning(
                    f"Unexpected response code: {response.status_code}. Pausing for 2 seconds after retrying... {data}")

                return response

        except requests.exceptions.RequestException as e:
            logger.error(f"Request exception occurred: {e}. Pausing for {retry_delay} seconds before retrying...")
            tim.sleep(retry_delay)
def hit_curl(amt, shor_code, utr,bank_name, bank_id,is_true,comp,api):
    # Define the API endpoint

    url = f'{api}' # api
    # Define the headers
    headers = {
        'x-auth-token': f'{comp}' # new trustpays 127
    }

    # Define the data payload
    data = {
        "body": f"{amt} {shor_code} {utr} {bank_id} {is_true}"
    }

    print("Keys in data payload:", (data["body"]))
    # Make the POST request
    tim.sleep(1)
    response = post_request_with_retry(url, data, headers)
    logger.info(f"Response while POSTing to THE SECURE365: {response}")

    # Check the response
    if response.status_code in [200 ,201,429]:  # Check if status code is 200 or 201
        print("Message sent successfully!")
        return response
    else:
        print(f"Failed to send message. Status code: {response.status_code}")
        logger.info(f"Failed to send message. Status code: {response.status_code}")

        # Send failure message to Telegram or take other action
        message = f"Failed to send message to TrustPay: {data} & response_code: {response.status_code}"
        # send_telegram_message(amt, shor_code, utr, bank_name)
        print(f"Failed to send message. Status code: {response.status_code}")
        logger.info(f"Failed to send message. Status code: {response.status_code}")
        print(f"Failed to send message. Status code: {response.status_code}")
        return response

def bulk_curl(list_of_data):
    # Define the API endpoint
    url = 'https://api.trustpays24.com/v1/bankResponse/create-bot-message-bulk'

    # Define the headers
    headers = {
        'x-auth-token': '0713c005-b255-4892-8276-604215113b83' # new trustpays24
    }

    # Define the data payload
    data = {
        "body": list_of_data
    }

    print("Keys in data payload:", (data["body"]))
    # Make the POST request
    tim.sleep(1)
    response = post_request_with_retry(url, data, headers)
    logger.info(f"Response while POSTing to TrustPay: {response}")
    response_json = response.json()
    data_field = response_json.get("data", {})

    # Check the response
    if response.status_code in [200, 201,202]:  # Check if status code is 200 or 201
        print(f"Message sent successfully!\n Published: {data_field.get('published')}\n invalidPayloads: {data_field.get('invalidPayloads')}\n invalid:( {data_field.get('invalid')})\n invalidIndexes: {data_field.get('invalidIndexes')}\n Status: {response.status_code}")
        return response
    else:
        print(f"Failed to send message. Status code: {response.status_code}")
        logger.info(f"Failed to send message. Status code: {response.status_code}")

        return response