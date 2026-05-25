import time as tim
import requests
import trustpay_curl_2_0
from loguru import logger
import tp_settings_2_0
glitch = '-4812272124'
import random

mediator_url = [
    # f'https://api.telegram.org/bot8308745418:AAGuOIowA1X8usvARVfsKR2jM2biVFuN3oU/sendMessage',# pay-payny
    # f'https://api.telegram.org/bot7967071898:AAG-_oDLJuN7E-RMCcLQXlWzWRSt80s4m_0/sendMessage',# pay-payny
    f'https://api.telegram.org/bot7634849892:AAFmwCJq0Va0R9wO4ut3WQaUYBdER9umtA4/sendMessage',
    f'https://api.telegram.org/bot7878606673:AAGp0450BAdGl2HZxeYWVBiRHwGUj4SP584/sendMessage',
    f'https://api.telegram.org/bot7196060907:AAFNAZMsUzeSALCdz3TluFRIMU0MVLVJp4c/sendMessage',
    f'https://api.telegram.org/bot7619219786:AAEDU_MiFtmeFkV8GrzgImXwfth4uJII1D8/sendMessage',
    f'https://api.telegram.org/bot7712352576:AAGpVBQM6p3bltC3Md4OQgl2Yon7Nh0NdHk/sendMessage',
]

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
prvBot_token = ''
previous_url = None

# Function to get a new URL that's different from the previous one
def get_new_url():
    global previous_url
    # Select a random URL that's not the same as the previous one
    new_url = random.choice(mediator_url)
    while new_url == previous_url:
        new_url = random.choice(mediator_url)
    # Update the previous_url for the next round
    previous_url = new_url
    return new_url

Trustpay_bank_pending = '-1002499237112'
PDF_STM = '-4789458103'

def update_transaction(raw,amt,shor_code,utr,bank_name,bank_id,is_pending,comp,api):

    MESSAGE = f'/success {amt} {shor_code} {utr} {bank_id}'
    logger.info(f"/success {amt} {shor_code} {utr} {bank_id}")

    print('message after join', MESSAGE)

    trustpay_curl_2_0.hit_curl(amt,shor_code,utr,bank_name,bank_id,is_pending,comp,api)

def send_bank_pending_group(message):
    # pass
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': Trustpay_bank_pending, 'text': f'LAST UTR: {message}'}
    send_with_precaution(mediator_url1, params)

def PDF_BOT_STM_group(message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': PDF_STM, 'text': f'LAST UTR: {message}'}
    response = requests.post(mediator_url1 , json=params)

def send_last_utr_hdfc(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.HDFC[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    send_with_precaution(mediator_url1, params)

def send_last_utr_sbi(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.SBI[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_karnataka(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.KARNATAKA[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_pinelabs(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bank Name", bank_id)
    params = {'chat_id': tp_settings_2_0.pinelabs[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_induns(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.indusind[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_DCB_COP(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.DCB_COP[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_ESAF(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.ESAF[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_bom(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.BOM[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_jammukashmir(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.JAMMUKASHMIR[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_idbi_ret(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.IDBI_RET[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_IDBI_new_personal(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.IDBI_new_personal[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def last_utr_cbi(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.CBI[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_UDB(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.UDB[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_PAYTM(bank_id, message2,message,message1):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.PAYTM[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST TRANSACTION ID: {message1}  LAST CUSTOMER NAME: {message2} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_pnb(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.PNB[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_bob(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.BOB[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_boi_corporate(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.BOI_CORPORATE[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_TGSB(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.tjsb_bank[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

# def send_last_utr_TGSB_corp(bank_id, message):
#     mediator_url1 = get_new_url()
#     print("Bot token:", mediator_url1)
#     params = {'chat_id': tp_settings_2_0.tjsb_cop[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
#     return send_with_precaution(mediator_url1, params)

def send_last_utr_iob_per(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.IOB_PER[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_iob(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.IOB[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_iob_rea(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.IOB_ret[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_idbi(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.IDBI[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_idfc(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.IDFC[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_karnataka_corp(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.KARNATAKA_CORPORATE[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_idbi_cop(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.IDBI_COP[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_cbi(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.CBI[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_cbi_cop(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.CBI_COP[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_cbi_eez(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.CBI_EEZ[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_csb(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.CSB[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_psb(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.PSB[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)


def send_last_utr_TGSB_corp(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.tjsb_cop[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_suryoday_cop_bank(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.SURYODAY_COP[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)
def send_last_utr_axis(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.AXIS[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_SVC_PER(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.SVC_PER[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_indian(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.INDEN[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_BHARAT_PE(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.BHARAT_PE[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_psb_retail(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.PSB_RETAIL[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_canara(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.CANARA[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_tmb(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.TMB[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_union(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.UNION[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_fincare(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.FINCARE[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_phonepe(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.PHONEPE[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_GOOLGE(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.GOOGLE[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_rbl(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.RBL[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_sbi_portal(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.SBIPORTAL[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    # print("mi:",mediator_url1)
    return send_with_precaution(mediator_url1, params)

def send_last_utr_ipaisa_portal(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.ipaisa[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_declined(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.SBIPORTAL[bank_id]['last_utr_chat_id1'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_ipaisajona_declined(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.ipaisa[bank_id]['last_utr_chat_id1'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_uco(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.UCO[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_janabank(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.JANABANK[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_ujjivan(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.UJJIVAN[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_ujjivan_PER(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.UJJIVAN_PER[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_SIB(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.SIB[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_utkarsh(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.UTKARSH[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

# def send_last_utr_suryoday_bank(bank_id, message):
#     mediator_url1 = get_new_url()
#     print("Bot token:", mediator_url1)
#     params = {'chat_id': tp_settings_2_0.SURYODAY_BANK[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
#     return send_with_precaution(mediator_url1, params)

def send_last_utr_suryoday_bank(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.SURYODAY_BANK[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_suryoday_cop_bank(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.SURYODAY_COP[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_DBS_bank(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.DBS[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_suryoday_portal(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.SURYODAY_PORTAL[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_dhanlaxmi(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.DHANLAXMI[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_UNITY_SFB(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.UNITY_SFB[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_boi(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.BOI[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_boi_OMNI(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.BOI_OMI[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_mgb(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.MGB[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_federal(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.FEDERAL[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_cub(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.CUB[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_kotak(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.kotak[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_KVB(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.KVB[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_cub_personal(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.CUB_PERSONAL[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_bdc_retail(bank_id, message):
    mediator_url1 = get_new_url()
    print("Bot token:", mediator_url1)
    params = {'chat_id': tp_settings_2_0.bdc_retail[bank_id]['last_utr_chat_id'], 'text': f'BANK NAME: {bank_id} LAST UTR: {message}'}
    return send_with_precaution(mediator_url1, params)

def send_last_utr_glitch(bank_id, message):
    params = {'chat_id': glitch, 'text': bank_id + message }

def generate_random_number(s, e):
    return random.uniform(s, e)

def send_with_precaution(inurl, params):
    #tim.sleep(generate_random_number(0.7,1.5))
    def post_request_with_retry(inurl, params, retry_delay=3):
        while True:
            try:
                response = requests.post(inurl, json=params)

                if  response.status_code in [200,201]:
                    logger.info("Request succeeded.")
                    return response  # Return the successful response and all saved responses
                else:
                    logger.warning(
                        f"Unexpected response code: {response.status_code}. Pausing for 2 seconds before retrying... {params}")
                    response = requests.post(inurl, json=params)
                    tim.sleep(1)
                    logger.warning(
                        f"Unexpected response code: {response.status_code}. Pausing for 2 seconds after retrying... {params}")
                    return response

            except requests.exceptions.RequestException as e:
                logger.error(f"Request exception occurred: {e}. Pausing for {retry_delay} seconds before retrying...")
                tim.sleep(1)
    # Make the POST request

    # tim.sleep(generate_random_number(0.7,1.5))
    response = post_request_with_retry(inurl, params)
    logger.info(f"Response while POSTing to TrustPay: {response}")

    # Check the response
    if response.status_code in [200, 201]:  # Check if status code is 200 or 201
        print("Message sent successfully!")
        return response
    else:
        print(f"Failed to send message. Status code: {response.status_code}")
        logger.info(f"Failed to send message. Status code: {response.status_code}")
        print(f"Failed to send message. Status code: {response.status_code}")
        return response
