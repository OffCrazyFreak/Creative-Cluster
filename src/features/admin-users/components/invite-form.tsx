import { useAppForm } from "@/components/custom/form/app-form";
import { FieldGroup } from "@/components/ui/field";
import { LOCALES, LOCALE_NAMES } from "@/constants/locales";
import { USER_ROLES } from "@/constants/roles";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { inviteUserSchema } from "../admin-users-schemas";
import { inviteAdminUser } from "../admin-users.functions";
import { useUserActions } from "../hooks/use-user-actions";

const ROLE_LABELS = {
  admin: () => m.admin_users_role_admin(),
  member: () => m.admin_users_role_member(),
};

export default function InviteForm() {
  const perform = useUserActions();

  const form = useAppForm({
    defaultValues: {
      name: "",
      email: "",
      role: "member" as (typeof USER_ROLES)[number],
      locale: getLocale(),
    },
    validators: { onChange: inviteUserSchema },
    onSubmit: async ({ value, formApi }) => {
      const sent = await perform(
        inviteAdminUser({ data: value }),
        m.admin_users_invited({ email: value.email }),
      );
      if (sent) formApi.reset();
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <h2 className="text-lg font-semibold">{m.admin_users_invite_title()}</h2>
      <FieldGroup>
        <form.AppField name="name">
          {(field) => <field.TextField label={m.admin_users_invite_name()} />}
        </form.AppField>
        <form.AppField name="email">
          {(field) => (
            <field.TextField
              label={m.admin_users_invite_email()}
              type="email"
              autoComplete="off"
            />
          )}
        </form.AppField>
        <form.AppField name="role">
          {(field) => (
            <field.SelectField
              label={m.admin_users_invite_role()}
              options={USER_ROLES.map((role) => ({
                value: role,
                label: ROLE_LABELS[role](),
              }))}
            />
          )}
        </form.AppField>
        <form.AppField name="locale">
          {(field) => (
            <field.SelectField
              label={m.admin_users_invite_locale()}
              options={LOCALES.map((locale) => ({
                value: locale,
                label: LOCALE_NAMES[locale],
              }))}
            />
          )}
        </form.AppField>
      </FieldGroup>
      <form.AppForm>
        <form.SubmitButton>{m.admin_users_invite_submit()}</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}
