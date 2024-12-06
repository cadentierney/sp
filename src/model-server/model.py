import pandas as pd
import numpy as np
from prophet import Prophet

import json
from http.server import BaseHTTPRequestHandler, HTTPServer

def predict(features, forecast_length):
    df = pd.DataFrame(features, columns=["ds", "y"])
    m = Prophet()
    m.fit(df)

    future = m.make_future_dataframe(periods=forecast_length)
    forecast = m.predict(future)

    # Keep only the forecasted values
    forecast_prediction = forecast.loc[forecast["ds"] > df["ds"].max(), ["ds", "yhat"]].values.tolist()

    # Convert dates to strings
    forecast_prediction = [[str(x.date()), y] for x, y in forecast_prediction]

    return forecast_prediction

class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Check if the request path is correct
        if self.path == "/predict":
            # Set response code
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()

            # Get the content length and read the incoming data
            content_length = int(self.headers["Content-Length"])
            post_data = self.rfile.read(content_length)

            # Parse JSON data
            try:
                data = json.loads(post_data)
                features = data.get("features", [])
                forecast_length = data.get("forecastLength", 365)

                # Run the model
                prediction = predict(features, forecast_length)

                response = {"prediction": prediction}
                self.wfile.write(json.dumps(response).encode("utf-8"))
            except json.JSONDecodeError:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid JSON"}')
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'{"error": "Not Found"}')


def main():
    server_address = ("", 5167)
    httpd = HTTPServer(server_address, RequestHandler)
    print("Server running on port 5167...")
    httpd.serve_forever()

if __name__ == "__main__":
    main()
