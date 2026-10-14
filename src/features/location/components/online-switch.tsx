import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { m } from "@/paraglide/messages";

interface IOnlineSwitchProps {
  id: string;
  online: boolean;
  onChange: (online: boolean) => void;
}

export default function OnlineSwitch({
  id,
  online,
  onChange,
}: IOnlineSwitchProps) {
  return (
    <Field orientation="horizontal">
      <Switch id={id} checked={online} onCheckedChange={onChange} />
      <FieldLabel htmlFor={id}>{m.location_online_only()}</FieldLabel>
    </Field>
  );
}
