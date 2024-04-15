'use client'
import {useState, useRef, useEffect} from "react"
import styles from "./styles/styles.module.css"
import Modal from "../../../../components/modal"
import shortTextIcon from "../../../../assets/images/shorttext.svg"
import longTextIcon from "../../../../assets/images/longtext.svg"
import dropDownIcon from "../../../../assets/images/dropdown.svg"
import radioButtonIcon from "../../../../assets/images/radio.svg"
import checkBoxIcon from "../../../../assets/images/checkbox.svg"
import fileIcon from "../../../../assets/images/file.svg"
import dateIcon from "../../../../assets/images/date.svg"
import removeIcon from "../../../../assets/images/remove.svg"
import upRoundIcon from "../../../../assets/images/up_round.svg"
import downRoundIcon from "../../../../assets/images/down_round.svg"
import multiSelectTextIcon from "../../../../assets/images/multiSelectText.svg"
import SingleColumnIcon from "../../../../assets/images/singleColumn.js"
import DoubleColumnIcon from "../../../../assets/images/doubleColumn.js"
import CloseLightGreyIcon from "../../../../assets/images/close_light_grey.js"
import SaveIcon from "../../../../assets/images/save"
import SettingsIcon from "../../../../assets/images/settings"
import svgIcons from "../../../../assets/images/svgIcons"
import Image from "next/image"
import ShortText from "../../../../components/formComponents/shortText"
import LongText from "../../../../components/formComponents/longText"
import DropDown from "../../../../components/formComponents/dropDown"
import CheckBoxes from "../../../../components/formComponents/checkBoxes"
import RadioButtons from "../../../../components/formComponents/radioButtons"
import DateSelect from "../../../../components/formComponents/date"
import FileSelect from "../../../../components/formComponents/file"
import MultiSelectText from "../../../../components/formComponents/multiSelectText"
import {postPlain, postProtected} from "@/requests/post"
import { getProtected } from "@/requests/get"

import Switch from "react-switch"
import randomString from "randomstring"

const NewForm = () => {
    const [newForm, setNewForm] = useState({
        name: "",
        sections: [
            // {
            //     title: "New Section",
            //     layout: "single column",
            //     fields: [

            //     ]
            // }
        ],
        settings: {
            enabled: true,
            submissionLimit: 0,
            startDate: "",
            endDate: "",
            closeMessage: "",
            limitReachedMessage: "",
            submissionsClosedMessage: "",
            notifyCreatorOfNewSubmissions: true,
            whoCanModifyForm: "",
            exclusionList: [],
            created: "",
            lastModified: "",
            modificationHistory: []
        }
    })
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [endUsers, setEndUsers] = useState([])
    const [allUsers, setAllUsers] = useState([])
    const addOptionRef = useRef(null)

    useEffect(() => {
        fetchAllUsers()
        fetchAllEndUsers()
    }, [])

    const fetchAllUsers = async () => {
        try {
            const fetchAllUsersRequest = await getProtected("users/all")
        } catch (error) {
            console.log({error});
        }
    }

    const fetchAllEndUsers = () => {

    }


    const allAllowedFileFormats = ["PDF", "JPG", "PNG", "SVG", "GIF", "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTM"]

    console.log({svgIcons});

    const [addFieldModalSettings, setAddFieldModalSettings] = useState({
        showModal: false,
        sectionToAddFieldTo: null
    })

    const addNewSection = index => {
        let tempForm = {...newForm}
        tempForm.sections.splice(index, 0, {
            title: "New Section",
            layout: "single column",
            fields: [

            ]
        })
        setNewForm(tempForm)
    }

    const [propertyToEdit, setPropertyToEdit] = useState({})

    //Update each section's title with this function
    const updateSectiontitle = newTitle => {
        let tempForm = {...newForm}
        tempForm.sections[propertyToEdit.index].title = newTitle
        setNewForm(tempForm)
    }

    const setSectionToEdit = index => {
        let tempPropertyToEdit = {...propertyToEdit}
        tempPropertyToEdit = {
            type: "Section",
            index,
            fieldIndex: null
        }
        setPropertyToEdit(tempPropertyToEdit)
    }

    const showAddFieldToSectionModal = (event, index) => {
        event.stopPropagation()

        const tempAddFieldModalSettings = {...addFieldModalSettings}
        tempAddFieldModalSettings.showModal = true
        tempAddFieldModalSettings.sectionToAddFieldTo = index
        setAddFieldModalSettings(tempAddFieldModalSettings)
    }

    const closeAddFieldModalDiv = () => {
        const tempAddFieldModalSettings = {...addFieldModalSettings}
        tempAddFieldModalSettings.showModal = false
        tempAddFieldModalSettings.sectionToAddFieldTo = null
        setAddFieldModalSettings(tempAddFieldModalSettings)
    }

    const addFieldToSection = (fieldType, sectionIndex) => {
        let tempNewForm = {...newForm}
        console.log({addFieldModalSettings});

        console.log({currentSection: newForm.sections[addFieldModalSettings.sectionToAddFieldTo]});

        switch(fieldType) {
            case "shortText":
                tempNewForm.sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "Short text",
                    placeholder: "",
                    enabled: true,
                    maxLength: 256,
                    type: "shortText",
                    textType: "text",
                    label: "Short Text",
                    required: false
                })
                break;
            case "longText":
                tempNewForm.sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "",
                    placeholder: "",
                    enabled: true,
                    maxLength: 2560,
                    type: "longText",
                    label: "Long Text"
                })
                break;
            case "dropDown":
                tempNewForm.sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "",
                    placeholder: "",
                    enabled: true,
                    maxLength: 256,
                    options:[{
                        value: "Select an option",
                        disabled: true,
                        selected: true,
                        label: "Option 1"
                    }],
                    type: "dropDown",
                    label: "Drop Down"
                })
                break;
            case "checkBoxes":
                tempNewForm.sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "",
                    placeholder: "",
                    enabled: true,
                    maxLength: 256,
                    label: "Checkboxes",
                    type: "checkBoxes",
                    options:[{
                        value: "Select an option",
                        disabled: true,
                        selected: true,
                        label: "Option 1"
                    }],
                })
                break;
            case "radioButtons":
                tempNewForm.sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "",
                    placeholder: "",
                    enabled: true,
                    maxLength: 256,
                    label: "Radio Buttons",
                    type: "radioButtons",
                    options:[{
                        value: "Select an option",
                        disabled: true,
                        selected: true,
                        label: "Option 1"
                    }],
                })
                break;
            case "multiSelectText":
            tempNewForm.sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                value: "",
                defaultValue: "",
                placeholder: "",
                enabled: true,
                maxLength: 256,
                label: "Multi Select Text",
                type: "multiSelectText",
                options:[{
                    value: "Select an option",
                    disabled: true,
                    selected: true,
                    label: "Option 1"
                }],
                preSelectedOptions: [
                    {
                        value: "Preselected Option 1", 
                        label: "Preselected Option 1",
                        required: true
                    },
                    {
                        value: "Preselected Option 2", 
                        label: "Preselected Option 2",
                        required: true
                    },
                ]
            })
            break;
            case "file":
                tempNewForm.sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "",
                    placeholder: "",
                    enabled: true,
                    maxLength: 256,
                    type: "file",
                    label: "File Upload",
                    allowedFormats: ["JPG"],
                    maxAllowedFiles: 1,
                    allowSelectPreviouslyUploadedFile: true
                })
                break;
            case "date":
                tempNewForm.sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "Date",
                    placeholder: "",
                    enabled: true,
                    maxLength: 256,
                    type: "date",
                    textType: "text",
                    label: "Date",
                    required: false
                })
                break;
            // case "shortText":
            //     tempNewForm.sections[sectionIndex].push()
            //     break;
        }

        setNewForm(tempNewForm)

        let temp = {...addFieldModalSettings}
        temp.showModal = false
        setAddFieldModalSettings(temp)

        
    }

    const setFieldToEdit = (fieldType, fieldIndex, sectionIndex, event) => {
        console.log("Editing field");
        console.log({fieldType, fieldIndex, sectionIndex});
        let tempPropertyToEdit = {...propertyToEdit}
        tempPropertyToEdit = {
            type: "Field",
            fieldType,
            index: sectionIndex,
            fieldIndex
        }
        console.log({tempPropertyToEdit});
        setPropertyToEdit(tempPropertyToEdit)
    }

    const getFieldComponent = (field, fieldIndex, sectionIndex) => {
        switch (field.type) {
            case "shortText": {
                return <ShortText highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                placeholder={field.placeholder} 
                onClick={(event) => setFieldToEdit("shortText", fieldIndex, sectionIndex, event)} 
            />
            }

            case "longText": {
                return <LongText highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                placeholder={field.placeholder} 
                onClick={(event) => setFieldToEdit("longText", fieldIndex, sectionIndex, event)} 
            />
            }

            case "dropDown": {
                return <DropDown options={newForm.sections[sectionIndex].fields[fieldIndex].options} highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                placeholder={field.placeholder} 
                onClick={(event) => setFieldToEdit("dropDown", fieldIndex, sectionIndex, event)} 
            />
            }

            case "checkBoxes": {
                return <CheckBoxes options={newForm.sections[sectionIndex].fields[fieldIndex].options} highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                placeholder={field.placeholder} 
                onClick={(event) => setFieldToEdit("checkBoxes", fieldIndex, sectionIndex, event)} 
            />
            }

            case "radioButtons": {
                return <RadioButtons options={newForm.sections[sectionIndex].fields[fieldIndex].options} highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                placeholder={field.placeholder} 
                name={randomString.generate()}
                onClick={(event) => setFieldToEdit("checkBoxes", fieldIndex, sectionIndex, event)} 
            />
            }

            case "date": {
                return <DateSelect highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                placeholder={field.placeholder} 
                onClick={(event) => setFieldToEdit("shortText", fieldIndex, sectionIndex, event)} 
            />
            }

            case "file": {
                return <FileSelect highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                placeholder={field.placeholder} 
                allowedFormats={newForm.sections[sectionIndex].fields[fieldIndex].allowedFormats}
                onClick={(event) => setFieldToEdit("file", fieldIndex, sectionIndex, event)} 
            />
            }

            case "multiSelectText": {
                return <MultiSelectText options={newForm.sections[sectionIndex].fields[fieldIndex].options} highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                placeholder={field.placeholder} 
                name={randomString.generate()}
                preSelectedOptions={newForm.sections[sectionIndex].fields[fieldIndex].preSelectedOptions}
                onClick={(event) => setFieldToEdit("multiSelectText", fieldIndex, sectionIndex, event)} 
            />
            }
            
            
            
            
                
            
        }
    }

    const setSectionLayoutStyle = newLayout => {
        let tempForm = {...newForm}
        console.log({propertyToEdit});
        console.log({sectionToEdit: tempForm.sections[propertyToEdit.section]});
        tempForm.sections[propertyToEdit.index].layout = newLayout
        setNewForm(tempForm)
    }

    const updateFieldSettings = ({sectionIndex, fieldIndex, propertyToEdit, value}) => {
        let tempForm = {...newForm}
        tempForm.sections[sectionIndex].fields[fieldIndex][propertyToEdit] = value
        setNewForm(tempForm)
    }

    const addOptionToField = ({sectionIndex, fieldIndex, propertyToEdit, value}) => {
        let tempForm = {...newForm}
        tempForm.sections[sectionIndex].fields[fieldIndex].options.push({
            value,
            disabled: true,
            selected: true,
            label: value
        })
        setNewForm(tempForm)

        addOptionRef.current.value = ""
    }

    const addPreselectedOption = ({sectionIndex, fieldIndex, propertyToEdit, value}) => {
        let tempForm = {...newForm}
        tempForm.sections[sectionIndex].fields[fieldIndex].preSelectedOptions.concat({
            value,
            label: value,
            required: false,
            isPreselected: true
        })
        setNewForm(tempForm)

        addOptionRef.current.value = ""
    }

    const addAllowedFormat = ({sectionIndex, fieldIndex, propertyToEdit, value}) => {
        console.log({sectionIndex, fieldIndex, propertyToEdit, value});
        let tempForm = {...newForm}
        tempForm.sections[sectionIndex].fields[fieldIndex][propertyToEdit].push(value)
        setNewForm(tempForm)

    }

    const removeAllowedFormat = ({sectionIndex, fieldIndex, propertyToEdit, value}) => {
        let tempForm = {...newForm}
        tempForm.sections[sectionIndex].fields[fieldIndex].allowedFormats = tempForm.sections[sectionIndex].fields[fieldIndex].allowedFormats.filter(item => item !== value)
        setNewForm(tempForm)
    }

    const removeOptionFromField = ({sectionIndex, fieldIndex, propertyToEdit, value, optionIndex}) => {
        let tempForm = {...newForm}
        tempForm.sections[sectionIndex].fields[fieldIndex].options = tempForm.sections[sectionIndex].fields[fieldIndex].options.filter((item, itemIndex) => itemIndex !== optionIndex)
        setNewForm(tempForm)
    }

    const removePreselectedOption = ({sectionIndex, fieldIndex, propertyToEdit, value, optionIndex}) => {
        let tempForm = {...newForm}
        tempForm.sections[sectionIndex].fields[fieldIndex].preSelectedOptions = tempForm.sections[sectionIndex].fields[fieldIndex].preSelectedOptions.filter((item, itemIndex) => itemIndex !== optionIndex)
        setNewForm(tempForm)
    }

    const moveFieldInSection = ({sectionIndex, currentFieldIndex, newFieldIndex}) => {
        let tempForm = {...newForm}
        tempForm.sections[sectionIndex].fields = moveItemInArrayFromIndexToIndex(tempForm.sections[sectionIndex].fields, currentFieldIndex, newFieldIndex)
        setNewForm(tempForm)

        console.log({propertyToEdit});

        setFieldToEdit(propertyToEdit.fieldType, propertyToEdit.fieldIndex + 1, propertyToEdit.index)

        let tempPropertyToEdit = {...propertyToEdit}
        tempPropertyToEdit = {
            type: "Field",
            fieldType: propertyToEdit.fieldType,
            index: propertyToEdit.index,
            fieldIndex: newFieldIndex
        }
        console.log({tempPropertyToEdit});
        setPropertyToEdit(tempPropertyToEdit)
    }

    const moveSectionUpOrDown = ({sectionIndex, newSectionIndex}) => {
        let tempForm = {...newForm}
        tempForm.sections = moveItemInArrayFromIndexToIndex(tempForm.sections, sectionIndex, newSectionIndex)
        setNewForm(tempForm)

        console.log({propertyToEdit});

        // setFieldToEdit(propertyToEdit.fieldType, propertyToEdit.fieldIndex + 1, propertyToEdit.index)

        let tempPropertyToEdit = {...propertyToEdit}
        tempPropertyToEdit = {
            type: "Section",
            fieldType: null,
            index: newSectionIndex,
            fieldIndex: null
        }
        console.log({tempPropertyToEdit});
        setPropertyToEdit(tempPropertyToEdit)
    }

    const moveItemInArrayFromIndexToIndex = (array, fromIndex, toIndex) => {
        if (fromIndex === toIndex) return array;
      
        const newArray = [...array];
      
        const target = newArray[fromIndex];
        const inc = toIndex < fromIndex ? -1 : 1;
      
        for (let i = fromIndex; i !== toIndex; i += inc) {
          newArray[i] = newArray[i + inc];
        }
      
        newArray[toIndex] = target;
      
        return newArray;
    };

    const removeSection =  sectionIndex => {
        let tempNewForm = {...newForm}
        tempNewForm.sections = tempNewForm.sections.filter((item, index) => index !== sectionIndex)
        setNewForm(tempNewForm)
    }

    const removeField =  (sectionIndex, fieldIndex) => {
        let tempNewForm = {...newForm}
        tempNewForm.sections[sectionIndex].fields = tempNewForm.sections[sectionIndex].fields.filter((item, index) => index !== fieldIndex)
        setNewForm(tempNewForm)
    }

    const updateFormSettings = (setting, value) => {
        let tempForm = {...newForm}
        tempForm.settings[setting] = value
        setNewForm(tempForm)
    }

    const updateFormName = name => {
        let tempForm = {...newForm}
        tempForm.name = name
        setNewForm(tempForm)
    }

    const validateForm = () => {
        createNewForm()
    }

    const createNewForm = async () => {
        try {
            const createNewFormRequest = await postProtected("forms/new", {form: newForm})

            console.log({createNewFormRequest});
        } catch (error) {
            console.log({error});
        }
    }
    

    console.log({newForm});
    console.log({propertyToEdit});

    return (
        <div className={styles.newForm}>
            <h1>New Form</h1>

            

            <div className={styles.newFormContent}>
                <div className={styles.newFormContentLeft}>
                    <header className={styles.formTitle}>
                        <input placeholder="Form Title" onChange={event => updateFormName(event.target.value)} />
                    </header>
                    {
                        newForm.sections.length === 0 && <div className={styles.noSections}>
                            <p>You have not added any sections or field to this form</p>
                            <button onClick={() => addNewSection()}>Add a section</button>
                        </div>
                    }
                    
                    {
                        newForm.sections.map((item, index) => <div key={index} className={[styles.newSection, propertyToEdit.index === index && propertyToEdit.fieldIndex === null && styles.highlighted].join(" ")} onClick={() => setSectionToEdit(index)}>
                            <h2>{item.title}</h2>

                            <div className={[styles.sectionFieldsContainer, item.layout === "single column" ? styles.singleColumnLayout : styles.doubleCOlumnLayout].join(" ")}>
                                {
                                    item.fields.map((fieldItem, fieldIndex) => {
                                        return getFieldComponent(fieldItem, fieldIndex, index)
                                    })
                                }
                            </div>

                            <footer>
                                <button onClick={(event) => showAddFieldToSectionModal(event, index)}>Add a field</button>
                                <button onClick={() => addNewSection(index)}>Add Section Above</button>
                                <button onClick={() => addNewSection(index + 1)}>Add Section Under</button>
                            </footer>
                        </div>)
                    }

                    <div className={styles.formActionButtons}>
                        {
                            newForm.sections.length > 0 && newForm.name && <button onClick={() => validateForm()}>Save Form <SaveIcon /></button>
                        }

                        <button onClick={() => setShowSettingsModal(true)}>Form Settings <SettingsIcon /></button>
                    </div>
                </div>

                {
                    Object.values(propertyToEdit).length !== 0 && <div className={styles.newFormContentRight}>
                        <h3>{`Edit ${propertyToEdit.type}`}</h3>

                        <div className={styles.editSectionFields}>
                            {
                                propertyToEdit.type === "Section" && <div>
                                Section Title

                                <input placeholder="Section Title" defaultValue={newForm.sections[propertyToEdit.index].title} onChange={(event) => updateSectiontitle(event.target.value)}  />

                                <div className={styles.sectionLayoutSelector}>
                                    <div className={newForm.sections[propertyToEdit.index].layout === "single column" ? styles.active : styles.inactive} onClick={() => setSectionLayoutStyle("single column")}>
                                        {/* <Image src={singleColumnIcon} alt="Single column" style={{width: "30px", height: "30px"}} /> */}
                                        <SingleColumnIcon />
                                        <label>Single Column</label>
                                    </div>

                                    <div className={newForm.sections[propertyToEdit.index].layout === "double column" ? styles.active : styles.inactive} onClick={() => setSectionLayoutStyle("double column")}>
                                        {svgIcons.doubleColumn}
                                        <DoubleColumnIcon />
                                        {/* <Image src={doubleColumnIcon} alt="double column" style={{width: "30px", height: "30px"}} /> */}
                                        <label>Double Columns</label>
                                    </div>
                                </div>

                                <div className={styles.changeSectionPositionDiv}>

                                                {
                                                     <>
                                                        {
                                                            propertyToEdit.index !== 0 && <div onClick={() => moveSectionUpOrDown({sectionIndex: propertyToEdit.index,  newSectionIndex: propertyToEdit.index - 1})}>
                                                                <Image src={upRoundIcon} alt="move field up" />
                                                                <label>Move Up</label>
                                                            </div>
                                                        }

                                                        {
                                                            propertyToEdit.index !== newForm.sections.length - 1 && <div onClick={() => moveSectionUpOrDown({sectionIndex: propertyToEdit.index, newSectionIndex: propertyToEdit.index + 1})}>
                                                                <Image src={downRoundIcon} alt="move field down" />
                                                                <label>Move Down</label>
                                                            </div>
                                                        }

                                                        
                                                    </>
                                                }

                                                <div onClick={() => removeSection(propertyToEdit.index)}>
                                                    <Image src={removeIcon} alt="remove feild" />
                                                    <label>Remove</label>
                                                </div>
                                            
                                            </div>
                            </div>
                            }

                            {
                                propertyToEdit.type === "Field" && <div>
                                    {
                                        <div>
                                            <div className={styles.editFieldDivs}>
                                                <label>Field label</label>
                                                <input placeholder="Label" defaultValue={newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].defaultValue} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "label", value: event.target.value})}  />
                                            </div>

                                            <div className={styles.editFieldDivs}>
                                                <label>Default value</label>
                                                <input placeholder="Default value" defaultValue={newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].defaultValue} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "defaultValue", value: event.target.value})}  />
                                            </div>

                                            {
                                                (propertyToEdit.fieldType === "shortText" || propertyToEdit.fieldType === "longText") && 
                                                <div className={styles.editFieldDivs}>
                                                    <label>Placeholder</label>
                                                    <input placeholder="Placeholder" defaultValue={newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].placeholder} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "placeholder", value: event.target.value})}  />
                                                </div>
                                            }

                                            <div className={styles.editFieldDivs}>
                                                <label>Enabled</label>
                                                <Switch
                                                onChange={() => {
                                                    if (newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].enabled) {
                                                        updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "enabled", value: false})
                                                    } else {
                                                        updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "enabled", value: true})
                                                    }
                                                }}
                                                checked={newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].enabled} />
                                            </div>

                                            <div className={styles.editFieldDivs}>
                                                <label>Required</label>
                                                <Switch 
                                                onChange={() => {
                                                    if (newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].required) {
                                                        updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "required", value: false})
                                                    } else {
                                                        updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "required", value: true})
                                                    }
                                                }}
                                                 checked={newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].required} />
                                            </div>

                                            {
                                                (propertyToEdit.fieldType === "shortText" || propertyToEdit.fieldType === "longText") && 
                                                <div className={styles.editFieldDivs}>
                                                    <label>Max Length</label>
                                                    <input type="number" placeholder="Max length" defaultValue={newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].maxLength} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "placeholder", value: event.target.value})}  />
                                                </div>
                                            }

                                            {
                                                (propertyToEdit.fieldType === "file") && 
                                                <div className={styles.editFieldDivs}>
                                                    <label>Max Files Allowed</label>
                                                    <input type="number" placeholder="Maximum number of files" defaultValue={newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].maxAllowedFiles} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "placeholder", value: event.target.value})}  />
                                                </div>
                                            }

                                            {
                                                ( propertyToEdit.fieldType === "file") && <div className={styles.editFieldDivs}>
                                                    <label>Select previously uploaded files</label>
                                                    <Switch 
                                                    onChange={() => {
                                                        if (newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].allowSelectPreviouslyUploadedFile) {
                                                            updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "allowSelectPreviouslyUploadedFile", value: false})
                                                        } else {
                                                            updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "allowSelectPreviouslyUploadedFile", value: true})
                                                        }
                                                    }}
                                                    checked={newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].allowSelectPreviouslyUploadedFile} />
                                                </div>
                                            }

                                            

                                            {
                                               ( propertyToEdit.fieldType === "file") &&
                                                <div className={[styles.editFieldDivs, styles.allowedFormatsContainer].join(" ")}>
                                                    <label>Allowed Formats</label>
                                                    <div>
                                                        

                                                        {
                                                            allAllowedFileFormats.map((item, index) => <div key={index}>
                                                            <label>{item}</label>
                                                            <input type="checkbox" checked={newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].allowedFormats.includes(item)} onClick={(event) => {
                                                                let isChecked = newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].allowedFormats.includes(item)

                                                                if (!isChecked) {
                                                                    addAllowedFormat({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "allowedFormats", value: item})
                                                                } else {
                                                                    removeAllowedFormat({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "allowedFormats", value: item})
                                                                }
                                                            }} />
                                                        </div>)
                                                        }

                                                        
                                                    </div>
                                                </div>
                                            }

                                            

                                            

                                            {
                                               ( propertyToEdit.fieldType === "shortText" || propertyToEdit.fieldType === "longText") &&
                                                <div className={styles.editFieldDivs}>
                                                    <label>Text Type</label>
                                                    <select onChange={event => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "textType", value: event.target.value})}>
                                                        <option value={"text"}>Text</option>
                                                        <option value={"number"}>Number</option>
                                                        <option value={"email"}>Email</option>
                                                    </select>
                                                </div>
                                            }

                                            {
                                                (propertyToEdit.fieldType === "dropDown" || propertyToEdit.fieldType === "radioButtons" || propertyToEdit.fieldType === "checkBoxes") && 
                                                    <div className={styles.editFieldDivs}>
                                                        <label>Options</label>

                                                        {
                                                            newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].options.map((optionItem, optionIndex) => <div key={optionIndex} className={styles.optionItem}>
                                                                <label>{optionItem.label}</label>
                                                                <Image src={removeIcon} alt="remove option" style={{width: "15px", height: "15px"}} onClick={() => removeOptionFromField({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "textType", optionIndex})} />
                                                            </div>)
                                                        }

                                                        

                                                        <div className={styles.addOptionDiv}>
                                                            <form onSubmit={event => {
                                                                event.preventDefault()
                                                                const newOptionValue = event.target[0].value

                                                                addOptionToField({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "textType", value: newOptionValue})
                                                            }}>
                                                                <input placeholder="Add option" ref={addOptionRef} />
                                                                <button>Add</button>
                                                            </form>
                                                        </div>
                                                    </div>
                                            }

                                            
                                            {/* This commented out section is for a setting that allows the form creator add pre-selected values to a multiselect text box. 
                                            The values can be set as required which would mean the form users cannot remove them. It was commented out because I ran into a roadblock with adding pre-selected options from outside 
                                            Multiselect text component while managing the user's entered values from within the component. I may finish it some time in the future but if I don't, you know what this block was supposed to do */}

                                            {/* {
                                                propertyToEdit.fieldType === "multiSelectText"  && 
                                                    <div className={styles.editFieldDivs}>
                                                        <label>Preselcted Options</label>

                                                        {
                                                            newForm.sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].preSelectedOptions.map((optionItem, optionIndex) => <div key={optionIndex} className={styles.multiSelectOptionItem}>
                                                                <div>
                                                                    <label>{optionItem.label}</label>
                                                                    <Image src={removeIcon} alt="remove option" style={{width: "15px", height: "15px"}} onClick={() => removePreselectedOption({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "textType", optionIndex})} />
                                                                </div>

                                                                <div>
                                                                    <label>Required</label>
                                                                    <input type="checkbox" />
                                                                </div>
                                                            </div>)
                                                        }

                                                        

                                                        <div className={styles.addOptionDiv}>
                                                            <form onSubmit={event => {
                                                                event.preventDefault()
                                                                const newOptionValue = event.target[0].value

                                                                addPreselectedOption({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "textType", value: newOptionValue})
                                                            }}>
                                                                <input placeholder="Add option" ref={addOptionRef} />
                                                                <button>Add</button>
                                                            </form>
                                                        </div>
                                                    </div>
                                            } */}


                                            <div className={styles.changeFieldPositionDiv}>

                                                {
                                                    newForm.sections[propertyToEdit.index].fields.length > 1 && <>
                                                        {
                                                            propertyToEdit.fieldIndex !== 0 && <div onClick={() => moveFieldInSection({sectionIndex: propertyToEdit.index, currentFieldIndex: propertyToEdit.fieldIndex, newFieldIndex: propertyToEdit.fieldIndex - 1})}>
                                                                <Image src={upRoundIcon} alt="move field up" />
                                                                <label>Move Up</label>
                                                            </div>
                                                        }

                                                        {
                                                            propertyToEdit.fieldIndex !== newForm.sections[propertyToEdit.index].fields.length - 1 && <div onClick={() => moveFieldInSection({sectionIndex: propertyToEdit.index, currentFieldIndex: propertyToEdit.fieldIndex, newFieldIndex: propertyToEdit.fieldIndex + 1})}>
                                                                <Image src={downRoundIcon} alt="move field down" />
                                                                <label>Move Down</label>
                                                            </div>
                                                        }

                                                        
                                                    </>
                                                }

                                                <div onClick={() => removeField(propertyToEdit.index, propertyToEdit.fieldIndex)}>
                                                    <Image src={removeIcon} alt="remove feild" />
                                                    <label>Remove</label>
                                                </div>
                                            
                                            </div>

                                            

                                            
                                        </div>
                                    }
                                </div>
                            }
                            
                        </div>
                    </div>
                }
            </div>

            

            {/* <div>
                <label></label>
                <input placeholder="" />
            </div>

            <div>
                <label></label>
                <input placeholder="" />
            </div> */}

            

            {
                addFieldModalSettings.showModal && <Modal>
                    <div className={styles.addFieldModalContainer}>
                    <div className={styles.closeAddFieldModalDiv}>
                        <div onClick={() => closeAddFieldModalDiv()}>
                            <CloseLightGreyIcon />
                        </div>
                    </div>
                    <div className={styles.addFieldModal}>
                        <div>
                            <h2>Add a field</h2>

                            <div>
                                <div onClick={() => addFieldToSection("shortText")}>
                                    {/* <Image src={shortTextIcon} alt="short text field" style={{width: "50px", height: "50px", marginBottom: "20px"}} /> */}
                                    <Image src={shortTextIcon} alt="long text field" style={{width: "50px", height: "50px", marginBottom: "20px"}} />
                                    <label>Short Text</label>
                                </div>

                                <div onClick={() => addFieldToSection("longText")}>
                                    <Image src={longTextIcon} alt="long text field" style={{width: "50px", height: "50px", marginBottom: "20px"}} />
                                    <label>Long Text</label>
                                </div>

                                <div onClick={() => addFieldToSection("dropDown")}>
                                    <Image src={dropDownIcon} alt="dropdown field" style={{width: "50px", height: "50px", marginBottom: "20px"}} />
                                    <label>Drop Down</label>
                                </div>

                                <div onClick={() => addFieldToSection("checkBoxes")}>
                                    <Image src={checkBoxIcon} alt="checkbox field" style={{width: "50px", height: "50px", marginBottom: "20px"}} />
                                    <label>Checkboxes</label>
                                </div>

                                <div onClick={() => addFieldToSection("radioButtons")}>
                                    <Image src={radioButtonIcon} alt="radio button field" style={{width: "50px", height: "50px", marginBottom: "20px"}} />
                                    <label>Radio Group</label>
                                </div>

                                <div onClick={() => addFieldToSection("file")}>
                                    <Image src={fileIcon} alt="select file field" style={{width: "50px", height: "50px", marginBottom: "20px"}} />
                                    <label>File</label>
                                </div>

                                <div onClick={() => addFieldToSection("date")}>
                                    <Image src={dateIcon} alt="date field" style={{width: "50px", height: "50px", marginBottom: "20px"}} />
                                    <label>Date</label>
                                </div>

                                <div onClick={() => addFieldToSection("multiSelectText")}>
                                    <Image src={multiSelectTextIcon} alt="date field" style={{width: "100px", height: "50px", marginBottom: "20px"}} />
                                    <label>Multi-select Text</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
            </Modal>
            }


            {/* <Modal>
                <div>
                    <nav>
                        <p>Upload file</p>
                        <p>Select from uploaded files</p>
                    </nav>
                </div>
            </Modal> */}

            {
                showSettingsModal && <Modal>
                <div className={styles.formSettingsModal}>
                    <h3>Form Settings</h3>

                    <div>
                        <div>
                            <label>Enabled</label>

                            <Switch
                                onChange={() => {
                                    if (newForm.settings.enabled) {
                                        updateFormSettings("enabled", false)
                                    } else {
                                        updateFormSettings("enabled", true)
                                    }
                                }}
                                checked={newForm.settings.enabled} 
                            />
                        </div>


                        <div>
                            <label>Start Date</label>

                            <input type="datetime-local" onChange={event => updateFormSettings("startDate", event.target.value)} />
                        </div>


                        <div>
                            <label>End Date Date</label>

                            <input type="datetime-local" onChange={event => updateFormSettings("endDate", event.target.value)} />
                        </div>

                        <div>
                            <label>Submissions closed message</label>

                            <textarea placeholder="Enter a message for when submissions are closed." onChange={event => updateFormSettings("submissionsClosedMessage", event.target.value)}></textarea>
                        </div>

                        <div>
                            <label>Submissions Limit</label>

                            <input type="number" onChange={event => updateFormSettings("submissionsLimit", event.target.value)} />
                        </div>

                        <div>
                            <label>Limit reached message</label>

                            <textarea placeholder="Enter a message for when the submissions limit is reached." onChange={event => updateFormSettings("limitReachedMessage", event.target.value)}></textarea>
                        </div>

                        <div>
                            <label>Who can fill this form</label>

                            <select onChange={event => updateFormSettings("whoCanModifyForm", event.target.value)}>
                                <option value={"everyone"}>Everyone</option>
                                <option value={"anyone"}>Registered Users</option>
                                <option value={"anyone"}>Staff</option>
                                <option value={"anyone"}>Contractors</option>
                                <option value={"anyone"}>Select Specific Users</option>
                            </select>
                        </div>

                        <div>
                            <label>Who can modify this form</label>

                            <select onChange={event => updateFormSettings("whoCanModifyForm", event.target.value)}>
                                <option value={"creator"}>Only form creator and admin</option>
                                <option value={"anyone"}>Anyone</option>
                            </select>
                        </div>

                        <div>
                            <label>Notify form creator of new responses</label>

                            <Switch
                                onChange={() => {
                                    if (newForm.settings.notifyCreatorOfNewSubmissions) {
                                        updateFormSettings("notifyCreatorOfNewSubmissions", false)
                                    } else {
                                        updateFormSettings("notifyCreatorOfNewSubmissions", true)
                                    }
                                }}
                                checked={newForm.settings.notifyCreatorOfNewSubmissions} 
                            />
                        </div>

                        <div className={styles.closeButton}>
                            <button onClick={() => setShowSettingsModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            </Modal>
            }
        </div>
    )
}

export default NewForm

// enabled: true,
//             submissionLimit: 0,
//             closeDate: "",
//             closeMessage: "",
//             limitReachedMessage: "",
//             mailACopyOfResponseToFormCreator: true,
//             whoCanModifyForm: "",
//             exclusionList: [],
//             created: "",
//             lastModified: "",
//             modificationHistory: []