const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

exports.verifyCNIC = async (req, res) => {
    try {
        const { imageBase64 } = req.body; // Frontend se image base64 format mein aye gi

        const request = {
            image: { content: imageBase64.replace(/^data:image\/\w+;base64,/, "") },
            features: [
                { type: 'TEXT_DETECTION' },
                { type: 'OBJECT_LOCALIZATION' },
                { type: 'IMAGE_PROPERTIES' }
            ]
        };

        const [result] = await client.annotateImage(request);
        const text = result.textAnnotations[0]?.description || "";
        const objects = result.localizedObjectAnnotations;

        // 1. EXTRACTION (ID, DOB, Expiry)
        const cnicNumber = text.match(/[0-9]{5}-[0-9]{7}-[0-9]{1}/)?.[0];
        const dob = text.match(/Date of Birth\s*([\d.]{10})/i)?.[1];

        // 2. FORGERY/REALNESS DETECTION (Bina NADRA ke)
        let hasChip = false;
        let hasPhoto = false;
        
        objects.forEach(obj => {
            // Google Vision chip ko 'Electronic component' ya 'Microchip' detect karta hai
            if (obj.name === "Microchip" || obj.name === "Packaged goods") hasChip = true;
            if (obj.name === "Person") hasPhoto = true;
        });

        // Fake Check: Agar font blur hai ya manipulated hai (Confidence Score)
        const lowConfidence = result.textAnnotations.some(t => t.confidence < 0.8);
        const hasPakistanLogo = text.toLowerCase().includes("pakistan");

        // Aik real CNIC mein Chip, Logo aur Text sahi hota hai
        const isAuthenticLayout = hasChip && hasPakistanLogo && !lowConfidence;

        res.status(200).json({
            success: true,
            data: {
                cnicNumber,
                dob,
                hasChip,
                isAuthenticLayout,
                status: isAuthenticLayout ? "Real Layout Detected" : "Suspected/Fake Layout",
                rawText: text // Verification ke liye
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};