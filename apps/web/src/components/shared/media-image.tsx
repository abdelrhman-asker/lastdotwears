import Image, { type ImageProps } from 'next/image';

export default function MediaImage(props: ImageProps) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const cloudinaryDelivery =
    cloud &&
    typeof props.src === 'string' &&
    props.src.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`);

  return (
    <Image
      {...props}
      alt={props.alt}
      unoptimized={props.unoptimized || Boolean(cloudinaryDelivery)}
    />
  );
}
