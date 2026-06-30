#uses trained data for predictions
import joblib
import pandas as pd
from fetch_data import get_transactions
model = joblib.load("model/best_model.pkl")

wallet = "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe"

data = get_transactions(wallet)

transactions = data["result"]

total_transactions = len(transactions)

total_received = 0
total_sent = 0
failed_transactions = 0

for tx in transactions:

    value = int(tx["value"])

    if tx["to"].lower() == wallet.lower():
        total_received += value
    else:
        total_sent += value

    if tx["isError"] == "1":
        failed_transactions += 1

average_transaction_value = (
    (total_received + total_sent) / total_transactions
    if total_transactions > 0 else 0
)

wallet_age_days = 365

features = pd.DataFrame([{
    "total_transactions": total_transactions,
    "total_received": total_received,
    "total_sent": total_sent,
    "failed_transactions": failed_transactions,
    "average_transaction_value": average_transaction_value,
    "wallet_age_days": wallet_age_days
}])

#Make AI predictions
prediction = model.predict(features)

if prediction[0] == 1:
    print("⚠️ Suspicious Wallet Detected")
else:
    print("✅ Wallet Appears Safe")
