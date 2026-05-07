import { z } from "zod";
export declare const CardStatus: z.ZodEnum<["draft", "in_progress", "ordered", "archived", "deleted"]>;
export type CardStatus = z.infer<typeof CardStatus>;
export declare const CardOrientation: z.ZodEnum<["landscape", "portrait"]>;
export type CardOrientation = z.infer<typeof CardOrientation>;
export declare const ContributionMediaType: z.ZodEnum<["photo", "video", "audio"]>;
export type ContributionMediaType = z.infer<typeof ContributionMediaType>;
export declare const ContributionStatus: z.ZodEnum<["pending_scan", "public", "rejected", "removed"]>;
export type ContributionStatus = z.infer<typeof ContributionStatus>;
export declare const CardSettingsSchema: z.ZodObject<{
    passwordProtected: z.ZodBoolean;
    allowContributions: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    passwordProtected: boolean;
    allowContributions: boolean;
}, {
    passwordProtected: boolean;
    allowContributions: boolean;
}>;
export type CardSettings = z.infer<typeof CardSettingsSchema>;
export declare const CreateCardSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
    orientation: z.ZodDefault<z.ZodOptional<z.ZodEnum<["landscape", "portrait"]>>>;
}, "strip", z.ZodTypeAny, {
    orientation: "landscape" | "portrait";
    message?: string | undefined;
    title?: string | undefined;
}, {
    message?: string | undefined;
    title?: string | undefined;
    orientation?: "landscape" | "portrait" | undefined;
}>;
export type CreateCardInput = z.infer<typeof CreateCardSchema>;
export declare const UpdateCardSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
    orientation: z.ZodOptional<z.ZodEnum<["landscape", "portrait"]>>;
    settings: z.ZodOptional<z.ZodObject<{
        passwordProtected: z.ZodOptional<z.ZodBoolean>;
        allowContributions: z.ZodOptional<z.ZodBoolean>;
        password: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        passwordProtected?: boolean | undefined;
        allowContributions?: boolean | undefined;
        password?: string | undefined;
    }, {
        passwordProtected?: boolean | undefined;
        allowContributions?: boolean | undefined;
        password?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    message?: string | undefined;
    title?: string | undefined;
    orientation?: "landscape" | "portrait" | undefined;
    settings?: {
        passwordProtected?: boolean | undefined;
        allowContributions?: boolean | undefined;
        password?: string | undefined;
    } | undefined;
}, {
    message?: string | undefined;
    title?: string | undefined;
    orientation?: "landscape" | "portrait" | undefined;
    settings?: {
        passwordProtected?: boolean | undefined;
        allowContributions?: boolean | undefined;
        password?: string | undefined;
    } | undefined;
}>;
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>;
export declare const CardPasswordVerifySchema: z.ZodObject<{
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
}, {
    password: string;
}>;
export type CardPasswordVerifyInput = z.infer<typeof CardPasswordVerifySchema>;
export declare const ContributionCreateSchema: z.ZodObject<{
    mediaKey: z.ZodString;
    mediaType: z.ZodEnum<["photo", "video", "audio"]>;
    durationSec: z.ZodOptional<z.ZodNumber>;
    senderName: z.ZodString;
    senderMessage: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mediaKey: string;
    mediaType: "photo" | "video" | "audio";
    senderName: string;
    durationSec?: number | undefined;
    senderMessage?: string | undefined;
}, {
    mediaKey: string;
    mediaType: "photo" | "video" | "audio";
    senderName: string;
    durationSec?: number | undefined;
    senderMessage?: string | undefined;
}>;
export type ContributionCreateInput = z.infer<typeof ContributionCreateSchema>;
//# sourceMappingURL=card.d.ts.map