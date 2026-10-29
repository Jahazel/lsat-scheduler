import ProgressMotion from "./ProgressMotion";

export default function ProgressLayout({ children }: LayoutProps<"/progress">) {
  return <ProgressMotion>{children}</ProgressMotion>;
}
