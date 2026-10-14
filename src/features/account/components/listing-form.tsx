import { revalidateLogic } from "@tanstack/react-form";
import { useBlocker } from "@tanstack/react-router";
import { useState } from "react";

import { useAppForm } from "@/components/custom/form/app-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { m } from "@/paraglide/messages";

import { DEFAULT_COUNTRY } from "../listing-defaults";
import { useSaveListing, TagsNotSavedError } from "../hooks/use-save-listing";
import { validateListing } from "../listing-schemas";
import type { IOwnListing } from "../listing-types";
import BasicsSection from "./basics-section";
import ContactSection from "./contact-section";
import DetailsSection from "./details-section";
import ErrorSummary from "./error-summary";
import ImagesSection from "./images-section";
import LinksSection from "./links-section";
import LocationSection from "./location-section";
import TagsSection from "./tags-section";
import UnsavedChangesDialog from "./unsaved-changes-dialog";

interface IListingFormProps {
  listing: IOwnListing;
}

// The country select shows the site's home country as a default, so the value must hold it too.
function withDefaultCountry(values: IOwnListing["values"]) {
  const { location } = values;
  if (location.countryCode || location.onlineOnly || !DEFAULT_COUNTRY) {
    return values;
  }
  return { ...values, location: { ...location, countryCode: DEFAULT_COUNTRY } };
}

type Notice = "saved" | "unchanged" | "pending" | "failed" | "tags_failed";

function noticeText(notice: Notice): string {
  if (notice === "saved") return m.account_listing_saved();
  if (notice === "unchanged") return m.account_listing_unchanged();
  if (notice === "pending") return m.account_listing_pending();
  if (notice === "tags_failed") return m.account_listing_tags_failed();
  return m.account_listing_failed();
}

export default function ListingForm({ listing }: IListingFormProps) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const save = useSaveListing(listing);
  // Moves only with the owner's own saves: a refetch must not replace what the owner is looking at.
  const [initial, setInitial] = useState(() =>
    withDefaultCountry(listing.values),
  );

  const form = useAppForm({
    defaultValues: initial,
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: { onDynamic: validateListing },
    onSubmit: async ({ value, formApi }) => {
      setNotice(null);
      try {
        const result = await save.mutateAsync({
          values: value,
          baseline: initial,
        });
        // The server may have replaced the language with the one it detected.
        const saved = { ...value, sourceLocale: result.sourceLocale };
        // The form re-applies its default values on every render, so they must follow the save.
        setInitial(saved);
        formApi.reset(saved);
        if (result.status === "pending_review") setNotice("pending");
        else setNotice(result.changed ? "saved" : "unchanged");
      } catch (error) {
        setNotice(
          error instanceof TagsNotSavedError ? "tags_failed" : "failed",
        );
      }
    },
  });

  const blocker = useBlocker({
    shouldBlockFn: () => !form.state.isDefaultValue,
    enableBeforeUnload: () => !form.state.isDefaultValue,
    withResolver: true,
  });

  return (
    <form
      className="flex flex-col gap-8"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <ErrorSummary form={form} kind={listing.kind} />
      <BasicsSection form={form} />
      <LocationSection form={form} kind={listing.kind} />
      <ImagesSection form={form} kind={listing.kind} />
      <LinksSection form={form} />
      <ContactSection form={form} />
      <TagsSection form={form} />
      <DetailsSection form={form} kind={listing.kind} />
      <div aria-live="polite">
        {notice && (
          <Alert
            variant={notice.endsWith("failed") ? "destructive" : "default"}
          >
            <AlertDescription>{noticeText(notice)}</AlertDescription>
          </Alert>
        )}
      </div>
      <form.AppForm>
        <form.SubmitButton>{m.account_listing_save()}</form.SubmitButton>
      </form.AppForm>
      <UnsavedChangesDialog
        open={blocker.status === "blocked"}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />
    </form>
  );
}
