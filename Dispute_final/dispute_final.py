from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
import os

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "skillora_bert_model")

print("BERT model load ho raha hai...")
classifier = pipeline("text-classification", model=MODEL_PATH, tokenizer=MODEL_PATH)
print("✅ BERT model ready!")

@app.route('/predict-dispute', methods=['POST'])
def predict_dispute():
    try:
        data = request.get_json()
        message = data.get('message', '')

        if not message:
            return jsonify({'error': 'Message khali hai'}), 400

        result = classifier(message)[0]
        label = result['label']   # "DISPUTE" or "NORMAL" (from id2label)
        score = result['score']

        # Handle both id2label format and LABEL_X format
        if label in ("DISPUTE", "LABEL_1"):
            status = "DISPUTE"
        else:
            status = "NORMAL"

        print(f"[AI] '{message[:60]}' => {status} ({round(score*100,1)}%)")

        return jsonify({
            'status': status,
            'confidence': f"{round(score * 100, 2)}%",
            'message': message
        })

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

