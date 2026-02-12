"use client";

import {
  LoginFormValues,
  loginInitialValues,
  loginSchema,
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

export default function LoginForm() {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginInitialValues,
  });

  function onSubmit(values: LoginFormValues) {
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
      </FieldGroup>
      <Button type="submit" className="bg-primary w-full cursor-pointer py-6">
        Sign In
      </Button>
      <span className="text-muted-foreground block text-center">
        Don't have an account?{" "}
        <Link
          href="/signup"
          className="text-primary font-medium underline-offset-2 hover:underline"
        >
          Sign up
        </Link>
      </span>
    </form>
  );
}
