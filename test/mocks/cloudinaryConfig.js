// E2E test-mode mock for @/config/cloudinaryConfig — never uploads to
// real Cloudinary. Accepts whatever the upload route passes and returns
// a fake but well-formed response.
let counter = 0;

export const cloudinary = {
  uploader: {
    async upload() {
      counter += 1;
      return {
        secure_url: `https://e2e-fake-cdn.test/uploads/${counter}.jpg`,
        public_id: `e2e-upload-${counter}`,
      };
    },
  },
};
