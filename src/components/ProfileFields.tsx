import type { ProfileForm } from "../api/types";
import { Field } from "./AuthForm";

const today = new Date().toISOString().slice(0, 10);

export function ProfileFields({
  idPrefix,
  values,
  onChange,
}: {
  idPrefix: string;
  values: ProfileForm;
  onChange: (next: ProfileForm) => void;
}) {
  function set(key: keyof ProfileForm, value: string) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="form-grid">
      <Field
        id={`${idPrefix}Document`}
        label="DNI / Documento"
        value={values.documentNumber}
        onChange={(value) => set("documentNumber", value)}
        autoComplete="off"
        required={false}
      />
      <Field
        id={`${idPrefix}Phone`}
        label="Celular"
        type="tel"
        value={values.phone}
        onChange={(value) => set("phone", value)}
        autoComplete="tel"
        required={false}
      />
      <Field
        id={`${idPrefix}BirthDate`}
        label="Fecha de nacimiento"
        type="date"
        value={values.birthDate}
        onChange={(value) => set("birthDate", value)}
        autoComplete="bday"
        required={false}
        max={today}
      />
      <Field
        id={`${idPrefix}Street`}
        label="Domicilio"
        value={values.street}
        onChange={(value) => set("street", value)}
        autoComplete="street-address"
        required={false}
      />
      <Field
        id={`${idPrefix}City`}
        label="Ciudad"
        value={values.city}
        onChange={(value) => set("city", value)}
        autoComplete="address-level2"
        required={false}
      />
      <Field
        id={`${idPrefix}Province`}
        label="Provincia"
        value={values.province}
        onChange={(value) => set("province", value)}
        autoComplete="address-level1"
        required={false}
      />
      <Field
        id={`${idPrefix}PostalCode`}
        label="Código postal"
        value={values.postalCode}
        onChange={(value) => set("postalCode", value)}
        autoComplete="postal-code"
        required={false}
      />
    </div>
  );
}

export function BodyFields({
  idPrefix,
  values,
  onChange,
}: {
  idPrefix: string;
  values: ProfileForm;
  onChange: (next: ProfileForm) => void;
}) {
  function set(key: keyof ProfileForm, value: string) {
    onChange({ ...values, [key]: value });
  }

  return (
    <>
      <p className="profile-kicker lede">Medidas</p>
      <div className="form-grid">
        <Field
          id={`${idPrefix}Height`}
          label="Altura (cm)"
          type="number"
          value={values.heightCm}
          onChange={(value) => set("heightCm", value)}
          required={false}
          min="50"
          max="250"
          step="0.1"
        />
        <Field
          id={`${idPrefix}Weight`}
          label="Peso actual (kg)"
          type="number"
          value={values.weightKg}
          onChange={(value) => set("weightKg", value)}
          required={false}
          min="20"
          max="400"
          step="0.1"
        />
      </div>
      <label className="field" htmlFor={`${idPrefix}Medical`}>
        <span className="field-label">Observaciones</span>
        <textarea
          id={`${idPrefix}Medical`}
          rows={3}
          value={values.medicalNotes}
          onChange={(event) => set("medicalNotes", event.target.value)}
          placeholder="Lesión, patología o algo que haya que tener en cuenta"
        />
      </label>
    </>
  );
}

export function CoachFields({
  idPrefix,
  values,
  onChange,
}: {
  idPrefix: string;
  values: ProfileForm;
  onChange: (next: ProfileForm) => void;
}) {
  function set(key: keyof ProfileForm, value: string) {
    onChange({ ...values, [key]: value });
  }

  return (
    <>
      <p className="profile-kicker lede">Perfil profesional</p>
      <Field
        id={`${idPrefix}Specialties`}
        label="Especialidades"
        value={values.specialties}
        onChange={(value) => set("specialties", value)}
        required={false}
      />
      <label className="field" htmlFor={`${idPrefix}Bio`}>
        <span className="field-label">Biografía</span>
        <textarea
          id={`${idPrefix}Bio`}
          rows={3}
          value={values.biography}
          onChange={(event) => set("biography", event.target.value)}
        />
      </label>
      <Field
        id={`${idPrefix}Social`}
        label="Redes"
        value={values.socialLinks}
        onChange={(value) => set("socialLinks", value)}
        required={false}
      />
      <Field
        id={`${idPrefix}Certs`}
        label="Certificaciones"
        value={values.certifications}
        onChange={(value) => set("certifications", value)}
        required={false}
      />
    </>
  );
}
