import requests
import os

from dotenv import load_dotenv

load_dotenv()

ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY")


def get_transactions(wallet):

    url = (

        f"https://api.etherscan.io/v2/api"

        f"?chainid=1"

        f"&module=account"

        f"&action=txlist"

        f"&address={wallet}"

        f"&startblock=0"

        f"&endblock=99999999"

        f"&sort=asc"

        f"&apikey={ETHERSCAN_API_KEY}"
    )


    try:

        response = requests.get(

            url,

            timeout=10
        )

        data = response.json()

        print(data)

        return data


    except Exception as e:

        print("API ERROR:", e)

        return {

            "status": "0",

            "result": []
        }