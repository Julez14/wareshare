import z from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().trim().min(8, "Password must be 8 at least characters."),
});

export const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  email: z.email(),
  password: z.string().trim().min(8, "Password must be 8 at least characters."),
  confirmPassword: z
    .string()
    .trim()
    .min(8, "Password must be 8 at least characters."),
  role: z.enum(["renter", "host"]),
});

export const loginInitialValues: LoginFormValues = {
  email: "",
  password: "",
};

export const signupInitialValues: SignupFormValues = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "renter",
};

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
