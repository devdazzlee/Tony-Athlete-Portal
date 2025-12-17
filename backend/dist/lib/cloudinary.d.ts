import { v2 as cloudinary } from 'cloudinary';
export default cloudinary;
export declare const uploadImage: (file: string, folder?: string) => Promise<{
    url: string;
    publicId: string;
}>;
export declare const deleteImage: (publicId: string) => Promise<void>;
//# sourceMappingURL=cloudinary.d.ts.map