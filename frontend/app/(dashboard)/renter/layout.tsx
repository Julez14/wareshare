import RenterNav from "@/app/(dashboard)/renter/RenterNav";

export default function RenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <RenterNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
