# AI Room Design

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) that allows users to redesign rooms using AI.

## Getting Started

### Environment Setup

1. Create a `.env.local` file in the root directory based on the `.env.example` file
2. Sign up for a [Cloudinary account](https://cloudinary.com/users/register/free) if you don't have one
3. Add your Cloudinary credentials to the `.env.local` file:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

### Installation

Install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### Development Server

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Features

- **Image Upload**: Upload room images using Cloudinary for secure and efficient storage
- **Room Type Selection**: Choose from various room types (Living Room, Bedroom, etc.)
- **Design Type Selection**: Select different design styles for your room
- **Additional Requirements**: Specify any additional design requirements
- **AI-Powered Design Generation**: Transform your rooms using advanced AI image generation
- **Before/After Comparison**: Easily compare your original room with the AI-generated design
- **Design Gallery**: View all your previously generated designs in one place
- **Download & Share**: Save and share your favorite designs

## Cloudinary Integration

This project uses Cloudinary for image management with the following features:

- Secure image uploads directly to Cloudinary
- Optimized image delivery and transformation
- Responsive images across different devices
- Automatic backup and version history

## Replicate AI Integration

This project uses Replicate AI for room design generation with the following features:

- Advanced image-to-image transformation using Stable Diffusion XL
- Customizable design styles and room types
- High-quality interior design generation
- Preservation of original room structure with stylistic changes

## Learn More

To learn more about the technologies used, check out these resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Cloudinary Documentation](https://cloudinary.com/documentation) - learn about Cloudinary features
- [Next-Cloudinary](https://next-cloudinary.spacejelly.dev/) - Next.js specific Cloudinary components
- [Replicate AI Documentation](https://replicate.com/docs) - learn about Replicate AI features
- [Stable Diffusion XL](https://replicate.com/stability-ai/sdxl) - the AI model used for room redesign

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
"# AI-ROOM-DESIGNER" 
