"use client";

import {
  SignupFormValues,
  signupInitialValues,
  signupSchema,
} from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function SignupForm() {
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: signupInitialValues,
  });

  function onSubmit(values: SignupFormValues) {
    console.log(values);
  }

  return (
    <form
      className="border-border bg-card w-full max-w-lg space-y-4 rounded-lg border p-6"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="fullName"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
              <Input
                {...field}
                placeholder="John Doe"
                type="text"
                id="fullName"
              />
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                {...field}
                placeholder="your@email.com"
                type="email"
                id="email"
              />
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                {...field}
                placeholder="Create a strong password"
                type="password"
                id="password"
              />
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel htmlFor="confirmPassword">
                Confirm Password
              </FieldLabel>
              <Input
                {...field}
                placeholder="Confirm your password"
                type="password"
                id="confirmPassword"
              />
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <span className="mb-0">I am a:</span>
              <div className="flex flex-row justify-start gap-3 rounded-md border-2 p-2">
                <input
                  type="radio"
                  value="renter"
                  id="renter"
                  checked={field.value === "renter"}
                  onChange={() => field.onChange("renter")}
                />
                <FieldLabel htmlFor="renter" className="w-full">
                  Renter - Looking for space
                </FieldLabel>
              </div>
              <div className="flex flex-row justify-start gap-3 rounded-md border-2 p-2">
                <input
                  type="radio"
                  value="host"
                  id="host"
                  checked={field.value === "host"}
                  onChange={() => field.onChange("host")}
                />
                <FieldLabel htmlFor="host" className="w-full">
                  Host - Have space to rent
                </FieldLabel>
              </div>
            </div>
          )}
        />
      </FieldGroup>
      <Button type="submit" className="bg-primary w-full cursor-pointer py-6">
        Create Account
      </Button>
      <span className="text-muted-foreground block text-center">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary font-medium underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </span>
    </form>
  );
}
