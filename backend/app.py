from flask import Flask, request, jsonify
from flask_cors import CORS

import joblib
import pandas as pd

from fetch_data import get_transactions


# Create Flask App
app = Flask(__name__)

# Enable CORS
CORS(app)


# Load Trained Model
model = joblib.load("model/best_model.pkl")


# API Route
@app.route("/predict", methods=["POST"])

def predict():

    try:

        # Get Data From Frontend
        data = request.get_json()

        wallet = data["wallet"]


        # Wallet Validation
        if not wallet.startswith("0x") or len(wallet) != 42:

            return jsonify({

                "prediction":
                    "❌ Invalid Ethereum Wallet Address"

            })


        # Fetch Blockchain Transactions
        tx_data = get_transactions(wallet)

        transactions = tx_data.get("result", [])

        # Handle API Errors
        if not isinstance(transactions, list):
            return jsonify({

        "prediction":
            f"API Error: {transactions}"
        })


        # Initialize Features

        sent_tnx = 0

        received_tnx = 0

        total_sent_value = 0

        total_received_value = 0

        unique_sent_addresses = set()

        unique_received_addresses = set()

        timestamps = []

        created_contracts = 0


        # Loop Through Transactions
        for tx in transactions:

            value = int(tx.get("value", 0))

            timestamps.append(

                int(tx.get("timeStamp", 0))
            )


            # Sent Transactions
            if tx.get("from", "").lower() == wallet.lower():

                sent_tnx += 1

                total_sent_value += value

                unique_sent_addresses.add(

                    tx.get("to", "")
                )


            # Received Transactions
            if tx.get("to", "").lower() == wallet.lower():

                received_tnx += 1

                total_received_value += value

                unique_received_addresses.add(

                    tx.get("from", "")
                )


            # Created Contracts
            if tx.get("contractAddress", "") != "":

                created_contracts += 1


        # Average Values

        avg_val_received = (

            total_received_value / received_tnx

            if received_tnx > 0 else 0
        )


        avg_val_sent = (

            total_sent_value / sent_tnx

            if sent_tnx > 0 else 0
        )


        # Time Difference

        if len(timestamps) > 1:

            time_diff = (

                max(timestamps) - min(timestamps)

            ) / 60

        else:

            time_diff = 0


        # Create Features DataFrame

        features = pd.DataFrame([{

            "Sent tnx": sent_tnx,

            "Received Tnx": received_tnx,

            "avg val received": avg_val_received,

            "avg val sent": avg_val_sent,

            "Unique Received From Addresses":
                len(unique_received_addresses),

            "Unique Sent To Addresses":
                len(unique_sent_addresses),

            "Time Diff between first and last (Mins)":
                time_diff,

            "Number of Created Contracts":
                created_contracts
        }])


        # Print Features For Debugging
        print(features)


        # Make Prediction
        prediction = model.predict(features)


        # Final Result
        if prediction[0] == 1:

            result = "⚠️ Suspicious Wallet"

        else:

            result = "✅ Safe Wallet"


        # Return Response
        return jsonify({

            "prediction": result
        })


    # Error Handling
    except Exception as e:

        print("ERROR:", e)

        return jsonify({

            "prediction":
                f"Backend Error: {str(e)}"

        })


# Run Flask App
if __name__ == "__main__":

    app.run(debug=True)