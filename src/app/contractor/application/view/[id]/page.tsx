"use client";
import { useEffect, useState } from "react";
import styles from "./styles/styles.module.css";
import { getProtected } from "@/requests/get";
import { useParams } from "next/navigation";
import Accordion from "@/components/accordion";
import Link from "next/link";
import moment from "moment";
import { useSelector } from "react-redux";

type RegistrationForm = {
  _id?: String;
  vendorID?: String;
  files?: Array<any>;
  form?: {
    pages?: [
      {
        pageTitle?: String;
        sections?: [
          {
            layout?: String;
            title?: String;
            hideOnApproval?: Boolean;
            description?: String;
            allowMultiple?: Boolean;
            addSectionText?: String;
            fields?: [
              {
                value?: any;
                type?: any;
                placeholder?: any;
                options?: any;
                allowedFormats?: any;
                required?: boolean;
                maxAllowedFiles?: any;
                isACertificate?: boolean;
                hasExpiryDate?: any;
                label?: any;
                errorText?: any;
                textType?: any;
                infoText?: any;
                option?: any;
                text?: any;
                maxLength?: any;
                allowMultiple?: Boolean;
                addFieldText?: String;
                isDuplicate?: Boolean;
              }
            ];
          }
        ];
      }
    ];
  };
};

const ViewPage = () => {
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>(
    {}
  );
  const location = useParams();
  const user = useSelector((state: any) => state.user.user)

  useEffect(() => {
    console.log({ location });

    const vendorID = location?.id;

    if (vendorID) {
      getVendorForm(vendorID);
    }
  }, [location]);

  const getVendorForm = async (vendorID: any) => {
    try {
      console.log({ vendorID });

      const getVendorRegistrationFormRequest = await getProtected(
        `companies/register/form/${vendorID}`, user.role
      );

      if (getVendorRegistrationFormRequest.status === "OK") {
        let generalRegistrationForm =
          getVendorRegistrationFormRequest.data.generalRegistrationForm;
        let vendorRegistrationForm =
          getVendorRegistrationFormRequest.data.vendorRegistrationForm;

        let tempRegistrationForm = { ...registrationForm };
        tempRegistrationForm = generalRegistrationForm;
        setRegistrationForm(tempRegistrationForm);
      } else {
        // setErrorMessage(getVendorRegistrationFormRequest.error.message)
      }

      console.log({ getVendorRegistrationFormRequest });
    } catch (error) {
      console.log({ error });
    }
  };

  const getFileComponent = (file) => {
    console.log({ file });

    if (file.value.length > 0) {
      console.log("Has files");

      return (
        <div>
          {file.value.map((item, index) => (
            <div key={index} className={styles.fieldItem}>
              <label className={styles.fieldLabel}>{`${file.label} ${
                index > 1 ? index : ""
              }`}</label>

              <div className={styles.fileDetailsDiv}>
                <p>{item.name}</p>

                {item.expiryDate && (
                  <div className={styles.expiryDateDiv}>
                    Expires: <span>{item.expiryDate}</span>
                  </div>
                )}

                {item.url && (
                  <Link href={item.url} target="_blank">
                    View
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      return <p></p>;
    }
  };

  const getMultiSelectComponent = (field) => {
    if (field.value.length > 0) {
      console.log("Has files");

      return (
        <div className={styles.fieldItem}>
          <label className={styles.fieldLabel}>{`${field.label}:`}</label>
          <div className={styles.multiSelectItemsDiv}>
            {field.value.map((item, index) => (
              <p key={index} className={styles.fieldItem}>
                {item.value}
              </p>
            ))}
          </div>
        </div>
      );
    } else {
      return <p></p>;
    }
  };

  const getCertificateTimeValidity = expiryDate => {
    const currentDateObject = new Date()
    const expiryDateObject = new Date(expiryDate)
    

    if (currentDateObject.getTime() >= expiryDateObject.getTime()) {
        // let tempExpiredCertificates = [...expiredCertificates]
        // tempExpiredCertificates.push(expiryDate)
        // setExpiredCertificates(tempExpiredCertificates)
        
        return "expired"
    } else if ((expiryDateObject.getTime() - currentDateObject.getTime())/1000 < 7884000) {
        // let tempExpiringCertificates = [...expiringCertificates]
        // tempExpiringCertificates.push(expiryDate)
        // setExpiringCertificates(tempExpiringCertificates)   
        return "expiring"
    } else {
        return ""
    }
}

  const getFieldItemComponent = (field, index) => {
    switch (field.type) {
        case "shortText": 
        return <div key={index} className={styles.fieldItem}>
            <div>
                <p className={styles.fieldData}>
                    <label>{`${field.label}:`}</label>
                    <p>{field.value}</p>
                </p>
            </div>

            {
                field.approvalInfoText && <p className={styles.approvalInfoText}>Approval info text</p>
            }
        </div>
        case "longText": 
        return <div key={index} className={styles.fieldItem}>
        <div>
            <p className={styles.fieldData}>
                <label>{`${field.label}:`}</label>
                <p>{field.value}</p>
            </p>
        </div>

        {
            field.approvalInfoText && <p className={styles.approvalInfoText}>Approval info text</p>
        }
        </div>
        case "date":
            return <div key={index} className={styles.fieldItem}>
            <div>
                <p className={styles.fieldData}>
                    <label>{`${field.label}:`}</label>
                    <p>{moment(field.value).format("MMMM Do YYYY")}</p>
                </p>
            </div>

            {
                field.approvalInfoText && <p className={styles.approvalInfoText}>Approval info text</p>
            }
        </div>
        case "file": 
            if (field.value) {
                return <div key={index} className={styles.fieldItem}>
                <div>
                    <div className={styles.fieldData}>
                        <label>{`${field.label}:`}</label>
                        {
                            field?.value[0]?.url && <div>
                            <Link href={field?.value[0]?.url} target="_blank"><p>View</p></Link>
                        </div>
                        }
                        

                        {
                          field.hasExpiryDate && <a style={{marginLeft: "20px"}}>Certificate History</a>
                        }
                    </div>
                </div>

                {
                    field.approvalInfoText && <p className={styles.approvalInfoText}>Approval info text</p>
                }

                {
                    field.isACertificate && <>
                        {
                            field?.value[0]?.expiryDate && <p className={styles.expiryDateText}>{`Expiry date: ${field.value[0].expiryDate}`}</p>
                        }

                        {
                            field.value && field?.value[0]?.expiryDate && <>
                            
                                    {
                                        getCertificateTimeValidity(field.value[0].expiryDate) === "expired" && <p className={styles.certificateExpiredText}>Certificate has expired</p>
                                    }

                                    {
                                        getCertificateTimeValidity(field.value[0].expiryDate) === "expiring" && <p className={styles.certificateToExpireText}>Certificate will soon expire</p>
                                    }

                                    
                            </>
                        }

                        
                    </>
                }
            </div>
            }
        case "multiSelectText":
            return <div className={styles.fieldItem}>
                <p className={styles.fieldData}>
                <label>{`${field.label}:`}</label>
                {
                    field?.value?.length > 0 && <p className={styles.multiSelectTextValues}>{field?.value?.map((item, index) => <p key={index}>{item.label}</p>)}</p>
                }
            </p>
            </div>
            


    }
}

  const getFieldComponent = (field) => {
    switch (field.type) {
      case "shortText":
        return (
          <div className={styles.fieldItem}>
            <label className={styles.fieldLabel}>{`${field.label}: `}</label>
            <p className={styles.fieldValue}>{field.value}</p>
          </div>
        );
      case "dropDown":
        return (
          <div className={styles.fieldItem}>
            <label className={styles.fieldLabel}>{`${field.label}: `}</label>
            <p className={styles.fieldValue}>{field.value}</p>
          </div>
        );
      case "radioButtons":
        return (
          <div className={styles.fieldItem}>
            <label className={styles.fieldLabel}>{`${field.label}: `}</label>
            <p className={styles.fieldValue}>{field.value}</p>
          </div>
        );
      case "file":
        return getFileComponent(field);
      case "multiSelectText":
        return getMultiSelectComponent(field);
    }
  };
  return (
    <div className={styles.view}>
      {Object.values(registrationForm).length > 0 && (
        <>
          <h1>{registrationForm.form.pages[0].sections[0].fields[0].value}</h1>

          {/* <div className={styles.viewContent}>
            {registrationForm.form.pages.map((item, index) => (
              <Accordion
                defaultOpen={index === 0}
                key={index}
                title={item.pageTitle}
              >
                <div>
                  {item.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex}>
                      <h6>{section.title}</h6>

                      {section.fields.map((field, fieldIndex) =>
                        getFieldComponent(field)
                      )}
                      <hr />
                    </div>
                  ))}
                </div>
              </Accordion>
            ))}
          </div> */}


        <div className={styles.approvalContent}>

        {
            registrationForm.form.pages.map((item, index) => <Accordion defaultOpen={index === 0} key={index} title={item.pageTitle}>
                {
                    item.sections.map((sectionItem, sectionIndex) => {
                        if (!sectionItem.hideOnApproval) {
                            return <div key={sectionIndex} className={styles.sectionItem}>
                            <div>
                                <div className={styles.sectionHeader}>
                                    <h6>{sectionItem.title}</h6>

                                    
                                </div>

                                <div>
                                    {
                                        sectionItem.fields.map((fieldItem, fieldIndex) => getFieldItemComponent(fieldItem, fieldIndex))
                                    }
                                </div>

                                <div>
                                    

                                    
                                </div>



                                {
                                    sectionIndex !== item.sections.length - 1 && <hr />
                                }
                            </div>

                        </div>
                        }
                    })
                }
                
            </Accordion>)
        }

        </div>
        </>
      )}
    </div>
  );
};

export default ViewPage;
