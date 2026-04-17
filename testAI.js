async function query(data) {
    // Naya URL jo aapne screenshot mein dekha
    const url = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli";
    const token = "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";

    console.log("Testing with NEW Router URL...");

    try {
        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(data),
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error:", error.message);
    }
}

// Zero-shot classification test (jo is model ki specialty hai)
query({
    "inputs": "The surgical tools are very high quality.",
    "parameters": { "candidate_labels": ["positive", "negative"] }
}).then((response) => {
    console.log("--- AI SUCCESS! ---");
    console.log(JSON.stringify(response, null, 2));
});