#Converts raw data into ML features
from fetch_data import get_transactions
wallet = "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe"
data = get_transactions(wallet)
transactions = data["result"]
total_transactions = len(transactions)

total_received = 0

total_sent = 0

failed_transactions = 0
# total_transactions- number of transactions
# total_received- ETH received
# total_sent- ETH sent
# failed_transactions- failed tx count
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
print("Total Transactions:", total_transactions)

print("Total Received:", total_received)

print("Total Sent:", total_sent)

print("Failed Transactions:", failed_transactions)

print("Average Transaction Value:", average_transaction_value)

        
        
