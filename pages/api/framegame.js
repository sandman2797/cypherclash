import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    // Adjust the path according to your image location
    const imagePath = path.resolve('./public/images', 'frame_new_house.png');

    try {
        const imageBuffer = fs.readFileSync(imagePath);

        // Set the correct content type
        res.setHeader('Content-Type', 'image/jpeg'); // Adjust according to your image type (e.g., image/png for PNG images)

        // Send the image buffer in the response
        res.send(imageBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error reading image');
    }
}
