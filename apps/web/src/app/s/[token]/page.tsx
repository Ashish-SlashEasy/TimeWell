import { redirect } from "next/navigation";

export default function LegacySharePage({ params }: { params: { token: string } }) {
  redirect(`/message/${params.token}`);
}
