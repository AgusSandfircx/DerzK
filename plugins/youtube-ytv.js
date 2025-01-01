import axios from 'axios'
import fs from 'fs'
import os from 'os'
import { exec } from 'child_process'

let handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) throw `Usage: ${usedPrefix}${command} url reso`;

  m.reply(wait);
  const args = text.split(' ');
  const videoUrl = args[0];
  const resolution = args[1] || '480';

  const apiUrl = `${APIs.ryzen}/api/downloader/ytmp4?url=${encodeURIComponent(videoUrl)}&quality=${resolution}`;

  try {
    const response = await axios.get(apiUrl);
    const {
      title,
      author,
      authorUrl,
      views,
      uploadDate,
      description,
      videoUrl,
      duration,
      downloadUrl,
      quality
    } = response.data;

    if (!downloadUrl) throw 'Download URL not found in API response.';

    const tmpDir = os.tmpdir();
    const filePath = `${tmpDir}/${title.replace(/[^a-zA-Z0-9]/g, '_')}_${quality}.mp4`;

    const writer = fs.createWriteStream(filePath);
    const downloadResponse = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'stream',
    });

    downloadResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Fix the video duration using ffmpeg
    const outputFilePath = `${tmpDir}/${title.replace(/[^a-zA-Z0-9]/g, '_')}_${quality}_fixed.mp4`;
    await new Promise((resolve, reject) => {
      exec(`ffmpeg -i "${filePath}" -c copy "${outputFilePath}"`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    const caption = `Ini kak videonya @${m.sender.split('@')[0]}

*Title*: ${title} (${quality})
*Author*: ${author} (${authorUrl})
*Duration*: ${duration}
*Views*: ${views}
*Uploaded*: ${uploadDate}
*URL*: ${videoUrl}

*Description*: ${description}`;

    // Send the fixed video
    await conn.sendMessage(m.chat, {
      video: { url: outputFilePath },
      mimetype: 'video/mp4',
      fileName: `${title}_${quality}.mp4`,
      caption,
      mentions: [m.sender],
    }, { quoted: m });

    // Clean up temporary files
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Failed to delete original video file: ${err}`);
      } else {
        console.log(`Deleted original video file: ${filePath}`);
      }
    });

    fs.unlink(outputFilePath, (err) => {
      if (err) {
        console.error(`Failed to delete fixed video file: ${err}`);
      } else {
        console.log(`Deleted fixed video file: ${outputFilePath}`);
      }
    });

  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw `Failed to process request: ${error.message || error}`;
  }
};

handler.help = ['ytmp4']
handler.tags = ['downloader']
handler.command = /^(ytmp4)$/i

handler.limit = 10
handler.register = true
handler.disable = false

export default handler
