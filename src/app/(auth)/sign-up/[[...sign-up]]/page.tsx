import { SignUp } from "@clerk/nextjs";

const SignUpPage = () => {
  return (
    <main className="flex min-h-screen w-full items-center justify-center">
      <SignUp />
    </main>
  );
};
export default SignUpPage;