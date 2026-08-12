const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for admin rights, or anon key if bucket is public
);

/**
 * Uploads a file to Supabase Storage and returns the public URL
 * @param {string} filePath - Local path to the file (e.g., /tmp/file.pdf)
 * @param {string} fileName - Destination filename in the bucket
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
async function uploadContractPdf(filePath, fileName) {
  try {
    const fileBuffer = fs.readFileSync(filePath);

    // Upload to 'contracts' bucket
    const { data, error } = await supabase
      .storage
      .from('contracts')
      .upload(`signed/${fileName}`, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('contracts')
      .getPublicUrl(`signed/${fileName}`);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw error;
  }
}

module.exports = {
  uploadContractPdf
};
