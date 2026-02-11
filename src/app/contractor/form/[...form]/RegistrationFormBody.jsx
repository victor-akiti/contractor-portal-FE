import ButtonLoadingIcon from "@/components/buttonLoadingIcon";
import ButtonLoadingIconPrimary from "@/components/buttonLoadingPrimary";
import ErrorText from "@/components/errorText";
import FileUploader from "@/components/fileUploader";
import CheckBoxes from "@/components/formComponents/checkBoxes";
import DateSelect from "@/components/formComponents/date";
import DropDown from "@/components/formComponents/dropDown";
import FileSelector from "@/components/formComponents/file";
import LongText from "@/components/formComponents/longText";
import MultiSelectText from "@/components/formComponents/multiSelectText";
import RadioButtons from "@/components/formComponents/radioButtons";
import ShortText from "@/components/formComponents/shortText";
import TextBlock from "@/components/formComponents/textBlock";
import Modal from "@/components/modal";
import Tabs from "@/components/tabs";
import moment from "moment";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./styles/styles.module.css";

const RegistrationFormBody = ({
  registrationForm,
  showFinish,
  submitForm,
  submitting,
  showSuccess,
  currentFieldToUploadFor,
  savingForm,
  vendorID,
  updateField,
  addCertificates,
  closeUploadModal,
  errorMessage,
  activePage,
  goToPreviousPage,
  saveBeforeProgress,
  isComplete,
  tabs,
  setActivePage,
  addFieldToSection,
  removeFieldFromSection,
  setFieldToUploadFor,
  removeCertificate,
  removeFileFromFileList,
  addSectionToPage,
  removeSectionFromPage,
}) => {
  const getFieldPlaceholder = (field) => {
    if (field.type === "shortText" && field.label === "Registered Number") {
      if (
        registrationForm.form.pages[0].sections[0].fields[1].value === "Business Name Registration"
      ) {
        return "e.g. 12345678";
      } else if (
        registrationForm.form.pages[0].sections[0].fields[1].value === "Company Registration"
      ) {
        return "e.g. RC 12345678";
      } else {
        return "Please select a CAC registration type first";
      }
    } else {
      return field.placeholder;
    }
  };

  const [fileSampleURL, setFileSampleURL] = useState("");

  const getFileVisibility = (fieldIndex, fieldItem, sectionIndex) => {
    if (
      registrationForm.form.pages[0].sections[0].fields[1].value === "Business Name Registration" &&
      (fieldItem.label === "Upload CAC Form 7" || fieldItem.label === "Upload CAC Form 2A")
    ) {
      return <span></span>;
    } else if (
      registrationForm.form.pages[0].sections[0].fields[1].value !== "Business Name Registration" &&
      fieldItem.label === "Upload CAC/BN Form 1"
    ) {
      return <span></span>;
    } else {
      return (
        <div key={fieldIndex} className={styles.fieldComponent}>
          <div className={styles.fileSelectorDiv}>
            <FileSelector
              key={fieldIndex}
              required={fieldItem.required}
              errorText={fieldItem.errorText}
              highlighted={""}
              infoText={fieldItem.infoText}
              label={fieldItem.label}
              onClick={() => {
                setFieldToUploadFor(
                  activePage.index,
                  sectionIndex,
                  fieldIndex,
                  fieldItem.maxAllowedFiles,
                );
              }}
              allowedFormats={[fieldItem.allowedFormats]}
              value={fieldItem.value}
              isACertificate={fieldItem.isACertificate}
              hasExpiryDate={fieldItem.hasExpiryDate}
              clearValues={() =>
                updateField(activePage.index, sectionIndex, fieldIndex, "value", "")
              }
              updateIssueDate={(newValues) =>
                updateField(activePage.index, sectionIndex, fieldIndex, "issueDate", "")
              }
              setErrorText={(errorText) =>
                updateField(activePage.index, sectionIndex, fieldIndex, "errorText", "")
              }
              updateExpiryDate={(newValues) =>
                updateField(activePage.index, sectionIndex, fieldIndex, "ExpiryDate", "")
              }
              removeFile={(fileID) => {
                removeFileFromFileList(activePage.index, sectionIndex, fieldIndex, fileID);
              }}
              removeCertificate={(certificateID) => removeCertificate(certificateID)}
            />

            {fieldItem?.fieldSample && (
              <div className={styles.uploadSampleDiv}>
                <Image
                  src={fieldItem?.fieldSample[0]?.url}
                  width={100}
                  height={100}
                  alt="Upload Sample"
                />
                <button onClick={() => setFileSampleURL(fieldItem?.fieldSample[0]?.url)}>
                  Show Sample
                </button>
              </div>
            )}
          </div>
          {
            <div className={styles.addFieldText}>
              {fieldItem.allowMultiple && (
                <div>
                  <a
                    onClick={() =>
                      addFieldToSection(fieldItem, activePage.index, sectionIndex, fieldIndex + 1)
                    }
                  >
                    {fieldItem.addFieldText}
                  </a>
                </div>
              )}

              {fieldItem.isDuplicate && (
                <div>
                  <a
                    onClick={() =>
                      removeFieldFromSection(fieldItem, activePage.index, sectionIndex, fieldIndex)
                    }
                  >
                    {"Remove"}
                  </a>
                </div>
              )}
            </div>
          }
        </div>
      );
    }
  };

  const getShortTextVisibility = (fieldIndex, fieldItem, sectionIndex) => {
    if (
      registrationForm?.form?.pages[7]?.sections[0]?.fields[0]?.value ===
        "Company/Corporate Body" &&
      (fieldItem.label === "First Name" ||
        fieldItem.label === "Surname" ||
        fieldItem.label === "Other Names")
    ) {
      return <span></span>;
    } else if (
      registrationForm?.form?.pages[7]?.sections[0]?.fields[sectionIndex]?.value !==
        "Company/Corporate Body" &&
      (fieldItem.label === "Company Name" || fieldItem.label === "Registration Number")
    ) {
      return <span></span>;
    } else {
      return (
        <div key={fieldIndex} className={styles.fieldComponent}>
          <ShortText
            defaultValue={fieldItem.value}
            key={fieldIndex}
            errorText={fieldItem.errorText}
            required={fieldItem.required}
            infoText={""}
            value={fieldItem.value}
            type={fieldItem.textType}
            label={fieldItem.label}
            onChange={(value) => {
              updateField(activePage.index, sectionIndex, fieldIndex, "value", value);
            }}
            onClick={() => {}}
            placeholder={getFieldPlaceholder(fieldItem)}
            highlighted={""}
          />
          {
            <div className={styles.addFieldText}>
              {fieldItem.allowMultiple && (
                <div>
                  <a
                    onClick={() =>
                      addFieldToSection(fieldItem, activePage.index, sectionIndex, fieldIndex + 1)
                    }
                  >
                    {fieldItem.addFieldText}
                  </a>
                </div>
              )}

              {fieldItem.isDuplicate && (
                <div>
                  <a
                    onClick={() =>
                      removeFieldFromSection(fieldItem, activePage.index, sectionIndex, fieldIndex)
                    }
                  >
                    {"Remove"}
                  </a>
                </div>
              )}
            </div>
          }
        </div>
      );
    }
  };

  const getDropDownVisibility = (fieldIndex, fieldItem, sectionIndex) => {
    if (
      registrationForm?.form?.pages[7]?.sections[0]?.fields[0]?.value ===
        "Company/Corporate Body" &&
      fieldItem.label === "Title"
    ) {
      return <span></span>;
    } else {
      return (
        <div key={fieldIndex} className={styles.fieldComponent}>
          <DropDown
            key={fieldIndex}
            value={fieldItem.value}
            required={fieldItem.required}
            errorText={fieldItem.errorText}
            onSelect={(value) =>
              updateField(activePage.index, sectionIndex, fieldIndex, "value", value)
            }
            infoText={fieldItem.infoText}
            highlighted={""}
            label={fieldItem.label}
            onClick={() => {}}
            options={fieldItem.options}
          />

          {
            <div className={styles.addFieldText}>
              {fieldItem.allowMultiple && (
                <div>
                  <a
                    onClick={() =>
                      addFieldToSection(fieldItem, activePage.index, sectionIndex, fieldIndex + 1)
                    }
                  >
                    {fieldItem.addFieldText}
                  </a>
                </div>
              )}

              {fieldItem.isDuplicate && (
                <div>
                  <a
                    onClick={() =>
                      removeFieldFromSection(fieldItem, activePage.index, sectionIndex, fieldIndex)
                    }
                  >
                    {"Remove"}
                  </a>
                </div>
              )}
            </div>
          }
        </div>
      );
    }
  };

  return (
    <div className={styles.newRegistration}>
      <h1>{vendorID ? "Update/Complete Registration" : "New Registration"}</h1>

      {fileSampleURL && (
        <Modal>
          <div className={styles.fileSampleModal}>
            <Image
              src={fileSampleURL}
              width={1000}
              height={1000}
              objectFit="cover"
              alt="File Sample"
              style={{ maxHeight: "100%", objectFit: "contain" }}
            />

            <div className={styles.closePreviewButtonDiv}>
              <button onClick={() => setFileSampleURL(null)}>Close Preview</button>
            </div>
          </div>
        </Modal>
      )}

      {Object.values(currentFieldToUploadFor).length > 0 && (
        <Modal>
          <FileUploader
            label={
              registrationForm.form.pages[currentFieldToUploadFor.pageIndex].sections[
                currentFieldToUploadFor.sectionIndex
              ].fields[currentFieldToUploadFor.fieldIndex].label
            }
            updateCode={
              registrationForm.form.pages[currentFieldToUploadFor.pageIndex].sections[
                currentFieldToUploadFor.sectionIndex
              ].fields[currentFieldToUploadFor.fieldIndex].updateCode
            }
            updateUploadedFiles={(fileUrlsArray) => {
              updateField(
                currentFieldToUploadFor.pageIndex,
                currentFieldToUploadFor.sectionIndex,
                currentFieldToUploadFor.fieldIndex,
                "value",
                fileUrlsArray,
              );
              const currentField =
                registrationForm.form.pages[currentFieldToUploadFor.pageIndex].sections[
                  currentFieldToUploadFor.sectionIndex
                ].fields[currentFieldToUploadFor.fieldIndex];
              if (currentField.isACertificate) {
                addCertificates(fileUrlsArray);
              }
              closeUploadModal();
            }}
            files={registrationForm.files}
            maxFiles={currentFieldToUploadFor.maxFiles}
            closeUploader={() => closeUploadModal()}
          />
        </Modal>
      )}

      {errorMessage && <ErrorText text={errorMessage} />}

      {registrationForm.form && (
        <div>
          <div className={styles.actionButtonsTop}>
            {activePage.index > 0 && <button onClick={() => goToPreviousPage()}>Previous</button>}

            {activePage.index <= registrationForm.form.pages.length - 1 &&
              !showFinish &&
              !showSuccess && (
                <button onClick={() => saveBeforeProgress()}>
                  Save & go to next page {savingForm && <ButtonLoadingIconPrimary />}
                </button>
              )}

            {isComplete && <button>Submit</button>}
          </div>

          {!showSuccess && (
            <Tabs
              activeTab={activePage.label}
              tabs={tabs}
              updateActiveTab={(label, index) => {
                // let tempActivePage = {...activePage}
                // tempActivePage.label = label
                // tempActivePage.index = index
                // setActivePage(tempActivePage)
              }}
            />
          )}
        </div>
      )}

      {Object.values(registrationForm).length > 0 && !showFinish && (
        <div className={styles.registrationFormContent}>
          {registrationForm.form.pages[activePage.index].sections.map(
            (sectionItem, sectionIndex) => {
              // Check if section has remarks
              const hasRemarks = sectionItem.remarks && sectionItem.remarks.length > 0;

              return (
                <div
                  className={[
                    styles.section,
                    sectionItem.layout === "single column"
                      ? styles.singleColumn
                      : styles.doubleColumn,
                  ].join(" ")}
                  key={sectionIndex}
                >
                  <h3>{sectionItem.title}</h3>
                  <p>{sectionItem.description}</p>

                  {/* Remarks Display - Show at top of section */}
                  {hasRemarks && (
                    <div className={styles.remarksContainer}>
                      <div className={styles.remarksHeader}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M8 14A6 6 0 108 2a6 6 0 000 12zM8 5v3m0 2h.01"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <h4 className={styles.remarksTitle}>Review Notes</h4>
                      </div>

                      <div className={styles.remarksList}>
                        {sectionItem.remarks.map((remarkItem, remarkIndex) => (
                          <div key={remarkIndex} className={styles.remarkItem}>
                            <p className={styles.remarkText}>{remarkItem.remark}</p>
                            <div className={styles.remarkTimestamp}>
                              {moment(remarkItem.date).format("MMM DD, YYYY [at] h:mm A")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    {sectionItem.fields.map((fieldItem, fieldIndex) => {
                      if (fieldItem.type === "shortText") {
                        return getShortTextVisibility(fieldIndex, fieldItem, sectionIndex);
                      }

                      if (fieldItem.type === "longText") {
                        return (
                          <div key={fieldIndex} className={styles.fieldComponent}>
                            <LongText
                              key={fieldIndex}
                              required={fieldItem.required}
                              errorText={fieldItem.errorText}
                              infoText={""}
                              type={fieldItem.textType}
                              label={fieldItem.label}
                              onClick={() => {}}
                              placeholder={fieldItem.placeholder}
                              highlighted={""}
                            />

                            {
                              <div className={styles.addFieldText}>
                                {fieldItem.allowMultiple && (
                                  <div>
                                    <a
                                      onClick={() =>
                                        addFieldToSection(
                                          fieldItem,
                                          activePage.index,
                                          sectionIndex,
                                          fieldIndex + 1,
                                        )
                                      }
                                    >
                                      {fieldItem.addFieldText}
                                    </a>
                                  </div>
                                )}

                                {fieldItem.isDuplicate && (
                                  <div>
                                    <a
                                      onClick={() =>
                                        removeFieldFromSection(
                                          fieldItem,
                                          activePage.index,
                                          sectionIndex,
                                          fieldIndex,
                                        )
                                      }
                                    >
                                      {"Remove"}
                                    </a>
                                  </div>
                                )}
                              </div>
                            }
                          </div>
                        );
                      }

                      if (fieldItem.type === "dropDown") {
                        return getDropDownVisibility(fieldIndex, fieldItem, sectionIndex);
                      }

                      if (fieldItem.type === "checkBoxes") {
                        return (
                          <div key={fieldIndex} className={styles.fieldComponent}>
                            <CheckBoxes
                              key={fieldIndex}
                              required={fieldItem.required}
                              errorText={fieldItem.errorText}
                              infoText={""}
                              highlighted={""}
                              label={fieldItem.label}
                              onClick={() => {}}
                              options={fieldItem.option}
                            />

                            {
                              <div className={styles.addFieldText}>
                                {fieldItem.allowMultiple && (
                                  <div>
                                    <a
                                      onClick={() =>
                                        addFieldToSection(
                                          fieldItem,
                                          activePage.index,
                                          sectionIndex,
                                          fieldIndex + 1,
                                        )
                                      }
                                    >
                                      {fieldItem.addFieldText}
                                    </a>
                                  </div>
                                )}

                                {fieldItem.isDuplicate && (
                                  <div>
                                    <a
                                      onClick={() =>
                                        removeFieldFromSection(
                                          fieldItem,
                                          activePage.index,
                                          sectionIndex,
                                          fieldIndex,
                                        )
                                      }
                                    >
                                      {"Remove"}
                                    </a>
                                  </div>
                                )}
                              </div>
                            }
                          </div>
                        );
                      }

                      if (fieldItem.type === "radioButtons") {
                        return (
                          <div key={fieldIndex} className={styles.fieldComponent}>
                            <RadioButtons
                              key={fieldIndex}
                              value={fieldItem.value}
                              required={fieldItem.required}
                              errorText={fieldItem.errorText}
                              infoText={""}
                              highlighted={""}
                              label={fieldItem.label}
                              setOptionAsValue={(value) =>
                                updateField(
                                  activePage.index,
                                  sectionIndex,
                                  fieldIndex,
                                  "value",
                                  value,
                                )
                              }
                              onClick={() => {}}
                              options={fieldItem.options}
                              name={fieldItem.label + fieldIndex}
                            />
                            {
                              <div className={styles.addFieldText}>
                                {fieldItem.allowMultiple && (
                                  <div>
                                    <a
                                      onClick={() =>
                                        addFieldToSection(
                                          fieldItem,
                                          activePage.index,
                                          sectionIndex,
                                          fieldIndex + 1,
                                        )
                                      }
                                    >
                                      {fieldItem.addFieldText}
                                    </a>
                                  </div>
                                )}

                                {fieldItem.isDuplicate && (
                                  <div>
                                    <a
                                      onClick={() =>
                                        removeFieldFromSection(
                                          fieldItem,
                                          activePage.index,
                                          sectionIndex,
                                          fieldIndex,
                                        )
                                      }
                                    >
                                      {"Remove"}
                                    </a>
                                  </div>
                                )}
                              </div>
                            }
                          </div>
                        );
                      }

                      if (fieldItem.type === "date") {
                        return (
                          <div key={fieldIndex} className={styles.fieldComponent}>
                            <DateSelect
                              required={fieldItem.required}
                              key={fieldIndex}
                              errorText={fieldItem.errorText}
                              value={fieldItem.value}
                              infoText={""}
                              highlighted={""}
                              label={fieldItem.label}
                              onClick={() => {}}
                              placeholder={""}
                              onChange={(value) => {
                                updateField(
                                  activePage.index,
                                  sectionIndex,
                                  fieldIndex,
                                  "value",
                                  value,
                                );
                              }}
                            />
                            {
                              <div className={styles.addFieldText}>
                                {fieldItem.allowMultiple && (
                                  <div>
                                    <a
                                      onClick={() =>
                                        addFieldToSection(
                                          fieldItem,
                                          activePage.index,
                                          sectionIndex,
                                          fieldIndex + 1,
                                        )
                                      }
                                    >
                                      {fieldItem.addFieldText}
                                    </a>
                                  </div>
                                )}

                                {fieldItem.isDuplicate && (
                                  <div>
                                    <a
                                      onClick={() =>
                                        removeFieldFromSection(
                                          fieldItem,
                                          activePage.index,
                                          sectionIndex,
                                          fieldIndex,
                                        )
                                      }
                                    >
                                      {"Remove"}
                                    </a>
                                  </div>
                                )}
                              </div>
                            }
                          </div>
                        );
                      }

                      if (fieldItem.type === "file") {
                        return getFileVisibility(fieldIndex, fieldItem, sectionIndex);
                      }

                      if (fieldItem.type === "multiSelectText") {
                        return (
                          <div key={fieldIndex} className={styles.fieldComponent}>
                            <MultiSelectText
                              key={fieldIndex}
                              required={fieldItem.required}
                              errorText={fieldItem.errorText}
                              highlighted={""}
                              onChange={(value) => {
                                updateField(
                                  activePage.index,
                                  sectionIndex,
                                  fieldIndex,
                                  "value",
                                  value,
                                );
                              }}
                              infoText={fieldItem.infoText}
                              label={fieldItem.label}
                              onClick={() => {}}
                              preSelectedOptions={fieldItem.value ? fieldItem.value : []}
                            />
                            {
                              <div className={styles.addFieldText}>
                                {fieldItem.allowMultiple && (
                                  <div>
                                    <a
                                      onClick={() =>
                                        addFieldToSection(
                                          fieldItem,
                                          activePage.index,
                                          sectionIndex,
                                          fieldIndex + 1,
                                        )
                                      }
                                    >
                                      {fieldItem.addFieldText}
                                    </a>
                                  </div>
                                )}

                                {fieldItem.isDuplicate && (
                                  <div>
                                    <a
                                      onClick={() =>
                                        removeFieldFromSection(
                                          fieldItem,
                                          activePage.index,
                                          sectionIndex,
                                          fieldIndex,
                                        )
                                      }
                                    >
                                      {"Remove"}
                                    </a>
                                  </div>
                                )}
                              </div>
                            }
                          </div>
                        );
                      }

                      if (fieldItem.type === "textBlock") {
                        return (
                          <TextBlock key={fieldIndex} onClick={() => {}} text={fieldItem.text} />
                        );
                      }

                      if (fieldItem.type === "") {
                      }

                      if (fieldItem.type === "") {
                      }
                    })}
                  </div>

                  {
                    <div className={styles.addSectionText}>
                      {sectionItem.allowMultiple && (
                        <div>
                          <a
                            className={styles.addSectionText}
                            onClick={() => {
                              addSectionToPage(sectionItem, activePage.index, sectionIndex);
                            }}
                          >
                            {sectionItem.addSectionText}
                          </a>
                        </div>
                      )}

                      {sectionItem.isDuplicate && (
                        <div>
                          <a
                            className={styles.removeSectionText}
                            onClick={() => {
                              removeSectionFromPage(sectionItem, activePage.index, sectionIndex);
                            }}
                          >
                            {"Remove"}
                          </a>
                        </div>
                      )}
                    </div>
                  }
                </div>
              );
            },
          )}
        </div>
      )}

      {showFinish && !showSuccess && (
        <div className={styles.finishDiv}>
          <p>Please review your information before submitting.</p>

          <p>You may still EDIT and save your information before you submit.</p>

          <p>
            Once you are fully satisfied, click on the button below to have your information
            submitted to Amni.
          </p>

          <p>An email notification will be sent to you to confirm receipt.</p>

          <p>
            Note that your submitting this information does not oblige Amni to engage your company
            as a vendor.
          </p>

          <button onClick={() => submitForm()}>
            SUBMIT APPLICATION {submitting && <ButtonLoadingIcon />}
          </button>
        </div>
      )}

      {showSuccess && (
        <div className={styles.finishDiv}>
          <h5 className="mb-4">Application Submitted!</h5>
          <p>
            Your registration for {registrationForm.form.pages[0].sections[0].fields[0].value} has
            been submitted for assessment and approval.
          </p>
          <p>An email notification will be sent to you about your approval status.</p>

          <p>
            <span>Please do not forget to read our</span>
            <Link href={"/terms"} legacyBehavior>
              <a href="/terms" target="_blank">
                Terms & Conditions
              </a>
            </Link>{" "}
            with regards to your use of this platform
          </p>

          <div className={styles.successActionLinks}>
            <Link href={"/contractor/dashboard"} legacyBehavior>
              <a>Back To Dashboard</a>
            </Link>
            <Link href={`/contractor/application/view/${registrationForm.vendorID}`} legacyBehavior>
              <a>View Application</a>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationFormBody;
