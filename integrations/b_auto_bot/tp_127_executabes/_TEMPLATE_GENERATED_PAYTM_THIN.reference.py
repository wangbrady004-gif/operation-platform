# Reference: shape of a hand-written TP_PAYTM_*.py from b_auto — only documentation.
#
# Ops runs this exact vendored file (path stored on merchant as executable_relative_path).
# Worker invokes: run_paytm_bot.py --thin-script <this path>.
#
# Imports pick the bank automation module inside tp_127_bank_mains (main / trj / new);
# filenames TP_PAYTM_TXN_* vs TP_PAYTM_NAME_* tell the ops UI which anchor fields to collect.

from tp_127_bank_mains import tp_127_paytm_trj_main
import tp_settings_2_0

try:
    bank = tp_settings_2_0.PAYTM['PROFILE_HERE']
    tp_127_paytm_trj_main.login()
    tp_127_paytm_trj_main.navigate_to_transactions()
    tp_127_paytm_trj_main.main_loop('PROFILE_HERE')

except Exception as e:
    print('Exception in main file', e)
