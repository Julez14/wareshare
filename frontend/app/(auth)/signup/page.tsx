import SignupForm from "@/app/(auth)/signup/SignupForm";
import Image from "next/image";

export default function SignupPage() {
  return (
    <div className="bg-muted flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="mb-2 text-center">
        <div className="mb-4 flex justify-center">
          <Image
            src="/logo.png"
            alt="Logo"
            width={128}
            height={128}
            priority
            className="mx-auto"
          />
        </div>
        <h1 className="text-foreground mb-2 text-4xl font-extrabold tracking-tight drop-shadow-sm">
          Create Your Account
        </h1>
        <h3 className="text-muted-foreground text-lg font-medium">
          Find the perfect{" "}
          <span className="text-primary font-semibold">warehouse storage</span>{" "}
          solution
        </h3>
      </div>
      <SignupForm />
    </div>
  );
}
