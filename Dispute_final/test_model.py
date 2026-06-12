from transformers import pipeline

clf = pipeline('text-classification', model='skillora_bert_model', tokenizer='skillora_bert_model')

tests = ['hlo', 'hello', 'tum na mery paise la liye', 'fraud ho tum', 'You are a liar']
for t in tests:
    r = clf(t, return_all_scores=True)[0]
    print(t, '->', r)
