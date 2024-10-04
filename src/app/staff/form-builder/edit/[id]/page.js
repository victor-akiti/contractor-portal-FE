'use client'
import {useState, useRef, useEffect} from "react"
import styles from "./styles/styles.module.css"
import Modal from "../../../../../components/modal/index"
import shortTextIcon from "../../../../../assets/images/shorttext.svg"
import longTextIcon from "../../../../../assets/images/longtext.svg"
import dropDownIcon from "../../../../../assets/images/dropdown.svg"
import radioButtonIcon from "../../../../../assets/images/radio.svg"
import checkBoxIcon from "../../../../../assets/images/checkbox.svg"
import parapgraphIcon from "../../../../../assets/images/paragraph.svg"
import fileIcon from "../../../../../assets/images/file.svg"
import dateIcon from "../../../../../assets/images/date.svg"
import removeIcon from "../../../../../assets/images/remove.svg"
import upRoundIcon from "../../../../../assets/images/up_round.svg"
import downRoundIcon from "../../../../../assets/images/down_round.svg"
import multiSelectTextIcon from "../../../../../assets/images/multiSelectText.svg"
import SingleColumnIcon from "../../../../../assets/images/singleColumn.js"
import DoubleColumnIcon from "../../../../../assets/images/doubleColumn.js"
import CloseLightGreyIcon from "../../../../../assets/images/close_light_grey.js"
import SaveIcon from "../../../../../assets/images/save"
import SettingsIcon from "../../../../../assets/images/settings"
import svgIcons from "../../../../../assets/images/svgIcons"
import Image from "next/image"
import ShortText from "../../../../../components/formComponents/shortText"
import LongText from "../../../../../components/formComponents/longText"
import DropDown from "../../../../../components/formComponents/dropDown"
import CheckBoxes from "../../../../../components/formComponents/checkBoxes"
import RadioButtons from "../../../../../components/formComponents/radioButtons"
import DateSelect from "../../../../../components/formComponents/date"
import FileSelect from "../../../../../components/formComponents/file"
import MultiSelectText from "../../../../../components/formComponents/multiSelectText"
import {postPlain, postProtected} from "@/requests/post"
import {putProtected} from "@/requests/put"
import { getProtected } from "@/requests/get"
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles


const QuillEditor = dynamic(() => import('react-quill'), { ssr: false });

import Switch from "react-switch"
import randomString from "randomstring"
import { useParams } from "next/navigation"
import Loading from "@/components/loading"
import SuccessMessage from "@/components/successMessage"
import ButtonLoadingIcon from "@/components/buttonLoadingIcon"
import TextBlock from "@/components/formComponents/textBlock"

const EditForm = () => {
    const [newForm, setNewForm] = useState({
        name: "",
        pages: [
            {
                pageTitle: "New Page",
                pageDescription: "Page description",
                sections: []
            }
        ],
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
            modificationHistory: [],
            isContractorApplicationForm: false
        }
    })
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [endUsers, setEndUsers] = useState([])
    const [allUsers, setAllUsers] = useState([])
    const [savingForm, setSavingForm] = useState(false)
    const addOptionRef = useRef(null)
    
      const [content, setContent] = useState('');


  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      [{ align: [] }],
      [{ color: [] }],
      ['code-block'],
      ['clean'],
    ],
  };


  const quillFormats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'list',
    'bullet',
    'link',
    'image',
    'align',
    'color',
    'code-block',
  ];


  const handleEditorChange = (newContent) => {
    setContent(newContent);
    updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "text", value: newContent, pageIndex: propertyToEdit.page})
  };

    const param = useParams()
    const [loadingMessage, setLoadingMessage] = useState("Fetching form....")
    const [fetchedForm, setFetchedForm] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")

    console.log({param});

    useEffect(() => {
        // fetchAllUsers()
        // fetchAllEndUsers()
        fetchForm()
    }, [param])

    const fetchForm = async () => {
        try {
           let {id} = param
           
           if (id) {
            const fetchFormRequest = await getProtected(`forms/form/${id}`)

            if (fetchFormRequest.status === "OK") {
                let tempForm = {...newForm}
                tempForm = fetchFormRequest.data.form
                setNewForm(tempForm)
                setLoadingMessage("")
                setFetchedForm(true)
            }

            console.log({fetchFormRequest});
           }
        } catch (error) {
            console.log({error});
        }
    }

    const allAllowedFileFormats = ["PDF", "JPG", "PNG", "SVG", "GIF", "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTM"]

    console.log({svgIcons});

    const [addFieldModalSettings, setAddFieldModalSettings] = useState({
        showModal: false,
        page: null,
        sectionToAddFieldTo: null
    })

    const addNewSection = (pageIndex, index) => {
        let tempForm = {...newForm}
        tempForm.pages[pageIndex].sections.splice(index, 0, {
            title: "New Section",
            layout: "single column",
            description: "",
            allowMultiple: false,
            hideOnApproval: false,
            hideOnView: false,
            fields: [

            ]
        })
        setNewForm(tempForm)
    }

    const duplicateSection = (pageIndex, index) => {
        let tempForm = {...newForm}
        tempForm.pages[pageIndex].sections.push({...tempForm.pages[pageIndex].sections[index]})
        setNewForm(tempForm)
    }

    const addNewPage = (index) => {
        console.log({pageIndex: index});
        let tempForm = {...newForm}
        tempForm.pages.splice(index, 0, {
            pageTitle: "New Page",
            pageDescription: "New Page Description",
            sections: []
        })
        setNewForm(tempForm)
    }

    const [propertyToEdit, setPropertyToEdit] = useState({
        page: 0,
        type: "Page"
    })

    //Update each section's title with this function
    const updateSectiontitle = newTitle => {
        let tempForm = {...newForm}
        tempForm.pages[propertyToEdit.page].sections[propertyToEdit.index].title = newTitle
        setNewForm(tempForm)
    }

    const updateSectionDescription = newDescription => {
        let tempForm = {...newForm}
        tempForm.pages[propertyToEdit.page].sections[propertyToEdit.index].description = newDescription
        setNewForm(tempForm)
    }

    const updateSectionAllowMultiple = (allowMultiple) => {
        let tempForm = {...newForm}
        tempForm.pages[propertyToEdit.page].sections[propertyToEdit.index]["allowMultiple"] = allowMultiple
        setNewForm(tempForm)
    }

    const updateHideOnApproval = (allowMultiple) => {
        let tempForm = {...newForm}
        tempForm.pages[propertyToEdit.page].sections[propertyToEdit.index]["hideOnApproval"] = allowMultiple
        setNewForm(tempForm)
    }

    const updateHideOnView = (allowMultiple) => {
        let tempForm = {...newForm}
        tempForm.pages[propertyToEdit.page].sections[propertyToEdit.index]["hideOnView"] = allowMultiple
        setNewForm(tempForm)
    }

    const updateSectionAddSectionText = addSectionText => {
        let tempForm = {...newForm}
        tempForm.pages[propertyToEdit.page].sections[propertyToEdit.index]["addSectionText"] = addSectionText
        setNewForm(tempForm)
    }

    const updateAddedSectionLabel = addSectionText => {
        let tempForm = {...newForm}
        tempForm.pages[propertyToEdit.page].sections[propertyToEdit.index]["addedSectionLabel"] = addSectionText
        setNewForm(tempForm)
    }

    const updatePageTitle = newTitle => {
        let tempForm = {...newForm}
        tempForm.pages[propertyToEdit.page].pageTitle = newTitle
        setNewForm(tempForm)
    }

    const updatePageDescription= newDescription => {
        let tempForm = {...newForm}
        tempForm.pages[propertyToEdit.page].pageDescription = newDescription
        setNewForm(tempForm)
    }

    const setSectionToEdit = (pageIndex, index) => {
        let tempPropertyToEdit = {...propertyToEdit}
        tempPropertyToEdit = {
            type: "Section",
            index,
            fieldIndex: null,
            page: pageIndex
        }
        setPropertyToEdit(tempPropertyToEdit)
    }

    const setPageToEdit = (pageIndex) => {
        let tempPropertyToEdit = {...propertyToEdit}
        tempPropertyToEdit = {
            type: "Page",
            page: pageIndex
        }
        setPropertyToEdit(tempPropertyToEdit)
    }

    const showAddFieldToSectionModal = (event, index, pageIndex) => {
        event.stopPropagation()

        const tempAddFieldModalSettings = {...addFieldModalSettings}
        tempAddFieldModalSettings.showModal = true
        tempAddFieldModalSettings.page = pageIndex
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
                tempNewForm.pages[addFieldModalSettings.page].sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "Short text",
                    infoText: "",
                    placeholder: "",
                    enabled: true,
                    maxLength: 256,
                    type: "shortText",
                    textType: "text",
                    label: "Short Text",
                    approvalLabel: "Short Text",
                    required: false,
                    allowMultiple: false,
                    addFieldText: "Add another field"
                })
                break;
            case "longText":
                tempNewForm.pages[addFieldModalSettings.page].sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "",
                    infoText: "",
                    placeholder: "",
                    enabled: true,
                    maxLength: 2560,
                    type: "longText",
                    label: "Long Text",
                    approvalLabel: "Long Text",
                    allowMultiple: false,
                    addFieldText: "Add another field"
                })
                break;
                case "textBlock":
                tempNewForm.pages[addFieldModalSettings.page].sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "",
                    infoText: "",
                    placeholder: "",
                    enabled: true,
                    maxLength: 2560,
                    type: "textBlock",
                    label: "Text Block",
                    approvalLabel: "Text Block",
                    text: "",
                    allowMultiple: false,
                    addFieldText: "Add another field"
                })
                break;
            case "dropDown":
                tempNewForm.pages[addFieldModalSettings.page].sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "",
                    infoText: "",
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
                    label: "Drop Down",
                    approvalLabel: "Drop Down",
                    allowMultiple: false,
                    addFieldText: "Add another field"
                })
                break;
            case "checkBoxes":
                tempNewForm.pages[addFieldModalSettings.page].sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "",
                    infoText: "",
                    placeholder: "",
                    enabled: true,
                    maxLength: 256,
                    label: "Checkboxes",
                    approvalLabel: "Checkboxes",
                    type: "checkBoxes",
                    options:[{
                        value: "Select an option",
                        disabled: true,
                        selected: true,
                        label: "Option 1"
                    }],
                    allowMultiple: false,
                    addFieldText: "Add another field"
                })
                break;
            case "radioButtons":
                tempNewForm.pages[addFieldModalSettings.page].sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "",
                    infoText: "",
                    placeholder: "",
                    enabled: true,
                    maxLength: 256,
                    label: "Radio Buttons",
                    approvalLabel: "Radio Buttons",
                    type: "radioButtons",
                    options:[{
                        value: "Select an option",
                        disabled: true,
                        selected: true,
                        label: "Option 1"
                    }],
                    allowMultiple: false,
                    addFieldText: "Add another field"
                })
                break;
            case "multiSelectText":
                tempNewForm.pages[addFieldModalSettings.page].sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                value: "",
                defaultValue: "",
                infoText: "",
                placeholder: "",
                enabled: true,
                maxLength: 256,
                label: "Multi Select Text",
                approvalLabel: "Multi Select Text",
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
                ],
                allowMultiple: false,
                    addFieldText: "Add another field"
            })
            break;
            case "file":
                tempNewForm.pages[addFieldModalSettings.page].sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "",
                    infoText: "",
                    placeholder: "",
                    enabled: true,
                    maxLength: 256,
                    type: "file",
                    label: "File Upload",
                    approvalLabel: "File Upload",
                    allowedFormats: ["JPG"],
                    maxAllowedFiles: 1,
                    isACertificate: false,
                    hasExpiryDate: false,
                    allowSelectPreviouslyUploadedFile: true,
                    allowMultiple: false,
                    addFieldText: "Add another field",
                    updateCode: randomString.generate({
                        length: 12,
                        charset: "alpanumeric"
                      })
                })
                break;
            case "date":
                tempNewForm.pages[addFieldModalSettings.page].sections[addFieldModalSettings.sectionToAddFieldTo].fields.push({
                    value: "",
                    defaultValue: "Date",
                    infoText: "",
                    placeholder: "",
                    enabled: true,
                    maxLength: 256,
                    type: "date",
                    textType: "text",
                    label: "Date",
                    approvalLabel: "Date",
                    required: false,
                    allowMultiple: false,
                    addFieldText: "Add another field"
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

    const setFieldToEdit = (fieldType, fieldIndex, sectionIndex, event,pageIndex) => {
        console.log("Editing field");
        console.log({fieldType, fieldIndex, sectionIndex, pageIndex});
        let tempPropertyToEdit = {...propertyToEdit}
        tempPropertyToEdit = {
            type: "Field",
            fieldType,
            index: sectionIndex,
            fieldIndex,
            page: pageIndex
        }
        console.log({tempPropertyToEdit});
        setPropertyToEdit(tempPropertyToEdit)
    }

    const getFieldComponent = (field, fieldIndex, sectionIndex, pageIndex) => {
        switch (field.type) {
            case "shortText": {
                return <ShortText highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                placeholder={field.placeholder} 
                infoText={field.infoText}
                errorText={field.errorText}
                onClick={(event) => setFieldToEdit("shortText", fieldIndex, sectionIndex, event, pageIndex)} 
            />
            }

            case "longText": {
                return <LongText highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                placeholder={field.placeholder} 
                infoText={field.infoText}
                errorText={field.errorText}
                onClick={(event) => setFieldToEdit("longText", fieldIndex, sectionIndex, event, pageIndex)} 
            />
            }

            case "dropDown": {
                return <DropDown options={newForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].options} highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                infoText={field.infoText}
                errorText={field.errorText}
                placeholder={field.placeholder} 
                onClick={(event) => setFieldToEdit("dropDown", fieldIndex, sectionIndex, event, pageIndex)} 
            />
            }

            case "checkBoxes": {
                return <CheckBoxes options={newForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].options} highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                infoText={field.infoText}
                errorText={field.errorText}
                placeholder={field.placeholder} 
                onClick={(event) => setFieldToEdit("checkBoxes", fieldIndex, sectionIndex, event, pageIndex)} 
            />
            }

            case "radioButtons": {
                return <RadioButtons options={newForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].options} highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                infoText={field.infoText}
                errorText={field.errorText}
                placeholder={field.placeholder} 
                name={randomString.generate()}
                onClick={(event) => setFieldToEdit("checkBoxes", fieldIndex, sectionIndex, event, pageIndex)} 
            />
            }

            case "date": {
                return <DateSelect highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                infoText={field.infoText}
                errorText={field.errorText}
                placeholder={field.placeholder} 
                onClick={(event) => setFieldToEdit("shortText", fieldIndex, sectionIndex, event, pageIndex)} 
            />
            }

            case "file": {
                return <FileSelect highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                infoText={field.infoText}
                errorText={field.errorText}
                placeholder={field.placeholder} 
                allowedFormats={newForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].allowedFormats}
                onClick={(event) => setFieldToEdit("file", fieldIndex, sectionIndex, event, pageIndex)} 
            />
            }

            case "multiSelectText": {
                return <MultiSelectText options={newForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].options} highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                infoText={field.infoText}
                errorText={field.errorText}
                placeholder={field.placeholder} 
                name={randomString.generate()}
                preSelectedOptions={newForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].preSelectedOptions}
                onClick={(event) => setFieldToEdit("multiSelectText", fieldIndex, sectionIndex, event, pageIndex)} 
            />
            }
            
            case "textBlock": {
                return <TextBlock options={newForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].options} highlighted={propertyToEdit.index === sectionIndex && propertyToEdit.fieldIndex === fieldIndex} 
                type={field.textType} 
                label={field.label} 
                infoText={field.infoText}
                errorText={field.errorText}
                text={field.text}
                placeholder={field.placeholder} 
                name={randomString.generate()}
                preSelectedOptions={newForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].preSelectedOptions}
                onClick={(event) => setFieldToEdit("textBlock", fieldIndex, sectionIndex, event, pageIndex)} 
            />
            }
        }
    }

    const setSectionLayoutStyle = newLayout => {
        let tempForm = {...newForm}
        console.log({propertyToEdit});
        console.log({sectionToEdit: tempForm.sections[propertyToEdit.section]});
        tempForm.pages[propertyToEdit.page].sections[propertyToEdit.index].layout = newLayout
        setNewForm(tempForm)
    }

    const updateFieldSettings = ({sectionIndex, fieldIndex, propertyToEdit, value, pageIndex}) => {
        let tempForm = {...newForm}
        tempForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex][propertyToEdit] = value
        setNewForm(tempForm)
    }

    const addOptionToField = ({sectionIndex, fieldIndex, propertyToEdit, value, pageIndex}) => {
        let tempForm = {...newForm}
        const optionsList = String(value).split(",")
        console.log({optionsList});
        for (let index = 0; index < optionsList.length; index++) {
            const element = optionsList[index];
            console.log({element});
            tempForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].options.push({
                value: String(element).trim(),
                disabled: true,
                selected: true,
                label: element
            })
            
        }
        
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

    const addAllowedFormat = ({sectionIndex, fieldIndex, propertyToEdit, value, pageIndex}) => {
        console.log({sectionIndex, fieldIndex, propertyToEdit, value});
        let tempForm = {...newForm}
        tempForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex][propertyToEdit].push(value)
        setNewForm(tempForm)

    }

    const removeAllowedFormat = ({sectionIndex, fieldIndex, propertyToEdit, value, pageIndex}) => {
        let tempForm = {...newForm}
        tempForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].allowedFormats = tempForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].allowedFormats.filter(item => item !== value)
        setNewForm(tempForm)
    }

    const removeOptionFromField = ({sectionIndex, fieldIndex, propertyToEdit, value, optionIndex, pageIndex}) => {
        let tempForm = {...newForm}
        tempForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].options = tempForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].options.filter((item, itemIndex) => itemIndex !== optionIndex)
        setNewForm(tempForm)
    }

    const removePreselectedOption = ({sectionIndex, fieldIndex, propertyToEdit, value, optionIndex, pageIndex}) => {
        let tempForm = {...newForm}
        tempForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].preSelectedOptions = tempForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex].preSelectedOptions.filter((item, itemIndex) => itemIndex !== optionIndex)
        setNewForm(tempForm)
    }

    const moveFieldInSection = ({sectionIndex, currentFieldIndex, newFieldIndex, pageIndex}) => {
        let tempForm = {...newForm}
        tempForm.pages[pageIndex].sections[sectionIndex].fields = moveItemInArrayFromIndexToIndex(tempForm.pages[pageIndex].sections[sectionIndex].fields, currentFieldIndex, newFieldIndex)
        setNewForm(tempForm)

        setFieldToEdit(propertyToEdit.fieldType, propertyToEdit.fieldIndex + 1, propertyToEdit.index)

        let tempPropertyToEdit = {...propertyToEdit}
        tempPropertyToEdit = {
            type: "Field",
            fieldType: propertyToEdit.fieldType,
            index: propertyToEdit.index,
            fieldIndex: newFieldIndex,
            page: propertyToEdit.page
        }
        console.log({tempPropertyToEdit});
        setPropertyToEdit(tempPropertyToEdit)
    }

    const moveSectionUpOrDown = ({sectionIndex, newSectionIndex, pageIndex}) => {
        console.log({pageIndex});
        let tempForm = {...newForm}
        tempForm.pages[pageIndex].sections = moveItemInArrayFromIndexToIndex(tempForm.pages[pageIndex].sections, sectionIndex, newSectionIndex)
        setNewForm(tempForm)

        console.log({propertyToEdit});

        // setFieldToEdit(propertyToEdit.fieldType, propertyToEdit.fieldIndex + 1, propertyToEdit.index)

        let tempPropertyToEdit = {...propertyToEdit}
        tempPropertyToEdit = {
            type: "Section",
            fieldType: null,
            index: newSectionIndex,
            fieldIndex: null,
            page: pageIndex
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

    const removeSection =  (sectionIndex, pageIndex) => {
        console.log({sectionIndex, pageIndex});
        let tempNewForm = {...newForm}
        tempNewForm.pages[pageIndex].sections = tempNewForm.pages[pageIndex].sections.filter((item, index) => index !== sectionIndex)
        setNewForm(tempNewForm)
    }

    const removeField =  (sectionIndex, fieldIndex, pageIndex) => {
        console.log({fieldIndex, fieldsLength: newForm.pages[pageIndex].sections[sectionIndex].fields.length - 1});
        if (newForm.pages[pageIndex].sections[sectionIndex].fields.length === 1) {
            setSectionToEdit(pageIndex, sectionIndex)
        } else if (fieldIndex === newForm.pages[pageIndex].sections[sectionIndex].fields.length - 1) {
            console.log("Setting field");
            console.log(newForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex - 1].type, fieldIndex - 1, sectionIndex);
            setFieldToEdit(newForm.pages[pageIndex].sections[sectionIndex].fields[fieldIndex - 1].type, fieldIndex - 1, sectionIndex, {}, pageIndex)
        }
        let tempNewForm = {...newForm}
        tempNewForm.pages[pageIndex].sections[sectionIndex].fields = tempNewForm.pages[pageIndex].sections[sectionIndex].fields.filter((item, index) => index !== fieldIndex)
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
        updateForm()
    }

    const createNewForm = async () => {
        try {
            setSavingForm(true)
            const createNewFormRequest = await postProtected("forms/new", {form: newForm})

            setSavingForm(false)

            console.log({createNewFormRequest});
        } catch (error) {
            console.log({error});
        }
    }

    const updateForm = async () => {
        try {
            const {id} = param
            setSavingForm(true)
            setLoadingMessage("Updating form..")
            setFetchedForm(false)

            const updateForm = await putProtected(`forms/form/${id}`, newForm)

            console.log({updateForm});

            setSavingForm(false)

            if (updateForm.status === "OK") {
                setLoadingMessage("")
                setFetchedForm(true)
                setSuccessMessage("Form updated successfully")
            }


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
                        <input defaultValue={newForm.name} placeholder="Form Title" onChange={event => updateFormName(event.target.value)} />
                    </header>
                    {/* {
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
                    } */}
                    <div>

                    </div>

                    <div className={styles.pagesTab}>
                            {newForm.pages.map((item, index) => <p onClick={() => setPageToEdit(index)} className={propertyToEdit.page === index ? styles.active : styles.inactive} key={index}>{item.pageTitle}</p>)}
                    </div>

                    {
                        <div onClick={() => setPageToEdit(propertyToEdit.page)}>
                        <h2>{newForm.pages[propertyToEdit.page].pageTitle}</h2>
                        <p className={styles.descriptionText}>{newForm.pages[propertyToEdit.page].pageDescription}</p>

                        {
                            newForm.pages[propertyToEdit.page].sections.length === 0 && <div className={styles.noSections}>
                            <p>You have not added any sections or fields to this page</p>
                            <button onClick={() => addNewSection(propertyToEdit.page, 0)}>Add a section</button>
                        </div>
                        }

                        {
                            newForm.pages[propertyToEdit.page].sections.map((item, index) => <div key={index} className={[styles.newSection, propertyToEdit.index === index && propertyToEdit.fieldIndex === null && styles.highlighted].join(" ")} onClick={(event) => {
                                event.stopPropagation()
                                setSectionToEdit(propertyToEdit.page, index)
                            }}>
                                <h3>{item.title}</h3>
                                <p className={styles.descriptionText}>{item.description}</p>

                                <div className={[styles.sectionFieldsContainer, item.layout === "single column" ? styles.singleColumnLayout : styles.doubleCOlumnLayout].join(" ")}>
                                    {
                                        item.fields.map((fieldItem, fieldIndex) => {
                                            return getFieldComponent(fieldItem, fieldIndex, index, propertyToEdit.page)
                                        })
                                    }
                                </div>

                                <footer>
                                    <button onClick={(event) => showAddFieldToSectionModal(event, index, propertyToEdit.page)}>Add a field</button>
                                    <button onClick={() => duplicateSection(propertyToEdit.page, index)}>Duplicate Section</button>
                                    <button onClick={() => addNewSection(propertyToEdit.page, index)}>Add Section Above</button>
                                    <button onClick={() => addNewSection(propertyToEdit.page, index + 1)}>Add Section Under</button>
                                </footer>
                            </div>)
                        }
                        <div className={styles.addPageDiv}>

                            <p onClick={() => addNewPage(propertyToEdit.page)}>Add page before</p>
                            <p onClick={() => addNewPage(propertyToEdit.page + 1)}>Add page after</p>
                        </div>
                    </div>
                    }

                    

                    <div className={styles.formActionButtons}>
                        {
                            newForm.pages.length > 0 && newForm.name && <button onClick={() => validateForm()}>Save Form <SaveIcon /> {savingForm && <ButtonLoadingIcon /> }</button>
                        }

                        <button onClick={() => setShowSettingsModal(true)}>Form Settings <SettingsIcon /></button>
                    </div>
                </div>

                {
                    Object.values(propertyToEdit).length !== 0 && <div className={styles.newFormContentRight}>
                        <h3>{`Edit ${propertyToEdit.type}`}</h3>

                        <div className={styles.editSectionFields}>
                        {
                                propertyToEdit.type === "Page" && <div>
                                Page Title

                                <input placeholder="Page title" defaultValue={newForm.pages[propertyToEdit.page].pageTitle} onChange={(event) => updatePageTitle(event.target.value)}  />
                                

                                <p className={styles.sectionLabels}>Page Description</p>
                                <input placeholder="Page description" defaultValue={newForm.pages[propertyToEdit.page].pageDescription} onChange={(event) => updatePageDescription(event.target.value)}  />

                                <div className={styles.changeSectionPositionDiv}>

                                                {
                                                     <>
                                                        {
                                                            propertyToEdit.index !== 0 && <div onClick={() => moveSectionUpOrDown({sectionIndex: propertyToEdit.index,  newSectionIndex: propertyToEdit.index - 1, pageIndex: propertyToEdit.page})}>
                                                                <Image src={upRoundIcon} alt="move field up" />
                                                                <label>Move Up</label>
                                                            </div>
                                                        }

                                                        {
                                                            propertyToEdit.index !== newForm.sections.length - 1 && <div onClick={() => moveSectionUpOrDown({sectionIndex: propertyToEdit.index, newSectionIndex: propertyToEdit.index + 1, pageIndex: propertyToEdit.page})}>
                                                                <Image src={downRoundIcon} alt="move field down" />
                                                                <label>Move Down</label>
                                                            </div>
                                                        }

                                                        
                                                    </>
                                                }

                                                <div onClick={() => removeSection(propertyToEdit.index, propertyToEdit.page)}>
                                                    <Image src={removeIcon} alt="remove field" />
                                                    <label>Remove</label>
                                                </div>
                                            
                                            </div>
                                </div>
                            }
                                {
                                propertyToEdit.type === "Section" && <div>
                                Section Title

                                <input placeholder="Section Title" defaultValue={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].title} onChange={(event) => updateSectiontitle(event.target.value)}  />
                                

                                <p className={styles.sectionLabels}>Section Description</p>
                                <input placeholder="Section Title" defaultValue={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].description} onChange={(event) => updateSectionDescription(event.target.value)}  />

                                <div className={styles.editFieldDivs}>
                                            <div style={{marginTop: "20px"}}></div>
                                                <label>Allow vendors add more of this section</label>
                                                <Switch
                                                onChange={() => {
                                                    if (newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].allowMultiple) {
                                                        updateSectionAllowMultiple(false)
                                                    } else {
                                                        updateSectionAllowMultiple(true)
                                                    }
                                                }}
                                                checked={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].allowMultiple} />
                                                <p className={styles.helperText}>Check this if you want the vendor to be able to add multiple instances of this section</p>
                                            </div>

                                            <div className={styles.editFieldDivs}>
                                            <div style={{marginTop: "20px"}}></div>
                                                <label>Hide on approvals page</label>
                                                <Switch
                                                onChange={() => {
                                                    if (newForm.pages[propertyToEdit.page]?.sections[propertyToEdit.index]?.hideOnApproval) {
                                                        updateHideOnApproval(false)
                                                    } else {
                                                        updateHideOnApproval(true)
                                                    }
                                                }}
                                                checked={newForm.pages[propertyToEdit.page]?.sections[propertyToEdit.index]?.hideOnApproval} />
                                                <p className={styles.helperText}>Check this if you want hide this section on the approvals page</p>
                                            </div>

                                            <div className={styles.editFieldDivs}>
                                            <div style={{marginTop: "20px"}}></div>
                                                <label>Hide on view page</label>
                                                <Switch
                                                onChange={() => {
                                                    if (newForm.pages[propertyToEdit.page]?.sections[propertyToEdit.index]?.hideOnView) {
                                                        updateHideOnView(false)
                                                    } else {
                                                        updateHideOnView(true)
                                                    }
                                                }}
                                                checked={newForm.pages[propertyToEdit.page]?.sections[propertyToEdit.index]?.hideOnView} />
                                                <p className={styles.helperText}>Check this if you want hide this section on the application view page.</p>
                                            </div>

                                            

                                            

                                            {
                                                newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].allowMultiple && <div className={styles.editFieldDivs}>
                                                    <label>Add section text</label>
                                                    <input placeholder="Add another field" defaultValue={newForm?.pages[propertyToEdit.page]?.sections[propertyToEdit.index]?.addSectionText} onChange={(event) => updateSectionAddSectionText(event.target.value)}  />
                                                </div>
                                            }

                                            {
                                                newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].allowMultiple && <div className={styles.editFieldDivs}>
                                                    <label>Added section label</label>
                                                    <input placeholder="Added section label" defaultValue={newForm?.pages[propertyToEdit.page]?.sections[propertyToEdit.index]?.addedSectionLabel} onChange={(event) => updateAddedSectionLabel(event.target.value)}  />
                                                </div>
                                            }

                                <div className={styles.sectionLayoutSelector}>
                                    <div className={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].layout === "single column" ? styles.active : styles.inactive} onClick={() => setSectionLayoutStyle("single column")}>
                                        {/* <Image src={singleColumnIcon} alt="Single column" style={{width: "30px", height: "30px"}} /> */}
                                        <SingleColumnIcon />
                                        <label>Single Column</label>
                                    </div>

                                    <div className={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].layout === "double column" ? styles.active : styles.inactive} onClick={() => setSectionLayoutStyle("double column")}>
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
                                                            propertyToEdit.index !== 0 && <div onClick={() => moveSectionUpOrDown({sectionIndex: propertyToEdit.index,  newSectionIndex: propertyToEdit.index - 1, pageIndex: propertyToEdit.page})}>
                                                                <Image src={upRoundIcon} alt="move field up" />
                                                                <label>Move Up</label>
                                                            </div>
                                                        }

                                                        {
                                                            propertyToEdit.index !== newForm.sections.length - 1 && <div onClick={() => moveSectionUpOrDown({sectionIndex: propertyToEdit.index, newSectionIndex: propertyToEdit.index + 1, pageIndex: propertyToEdit.page})}>
                                                                <Image src={downRoundIcon} alt="move field down" />
                                                                <label>Move Down</label>
                                                            </div>
                                                        }

                                                        
                                                    </>
                                                }

                                                <div onClick={() => removeSection(propertyToEdit.index, propertyToEdit.page)}>
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
                                                <input placeholder="Label" defaultValue={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].defaultValue} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "label", value: event.target.value, pageIndex: propertyToEdit.page})}  />
                                            </div>

                                            <div className={styles.editFieldDivs}>
                                                <label>Approval Label</label>
                                                <input placeholder="Approval label" defaultValue={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].defaultValue} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "approvalLabel", value: event.target.value, pageIndex: propertyToEdit.page})}  />
                                                <p className={styles.helperText}>Use this if you want the label on the form to be different from the label used during approvals.</p>
                                            </div>

                                            <div className={styles.editFieldDivs}>
                                                <label>Default value</label>
                                                <input placeholder="Default value" defaultValue={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].defaultValue} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "defaultValue", value: event.target.value, pageIndex: propertyToEdit.page})}  />
                                            </div>

                                            <div className={styles.editFieldDivs}>
                                                <label>Info Text</label>
                                                <input placeholder="Additional information for this field" defaultValue={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].defaultValue} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "infoText", value: event.target.value, pageIndex: propertyToEdit.page})}  />
                                            </div>

                                            {
                                                (propertyToEdit.fieldType === "shortText" || propertyToEdit.fieldType === "longText") && 
                                                <div className={styles.editFieldDivs}>
                                                    <label>Placeholder</label>
                                                    <input placeholder="Placeholder" defaultValue={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].placeholder} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "placeholder", value: event.target.value, pageIndex: propertyToEdit.page})}  />
                                                </div>
                                            }

                                            <div className={styles.editFieldDivs}>
                                                <label>Enabled</label>
                                                <Switch
                                                onChange={() => {
                                                    if (newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].enabled) {
                                                        updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "enabled", value: false, pageIndex: propertyToEdit.page})
                                                    } else {
                                                        updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "enabled", value: true, pageIndex: propertyToEdit.page})
                                                    }
                                                }}
                                                checked={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].enabled} />
                                            </div>

                                            <div className={styles.editFieldDivs}>
                                                <label>Allow vendors add more fields</label>
                                                <Switch
                                                onChange={() => {
                                                    if (newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].allowMultiple) {
                                                        updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "allowMultiple", value: false, pageIndex: propertyToEdit.page})
                                                    } else {
                                                        updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "allowMultiple", value: true, pageIndex: propertyToEdit.page})
                                                    }
                                                }}
                                                checked={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].allowMultiple} />
                                                <p className={styles.helperText}>Check this if you want the vendor to be able to add multiple instances of this field</p>
                                            </div>

                                            {
                                                newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].allowMultiple && <div className={styles.editFieldDivs}>
                                                    <label>Add field text</label>
                                                    <input placeholder="Add another field" defaultValue={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].addFieldText} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "addFieldText", value: event.target.value, pageIndex: propertyToEdit.page})}  />
                                                </div>
                                            }

                                            {
                                                newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].allowMultiple && <div className={styles.editFieldDivs}>
                                                    <label>Added field label</label>
                                                    <input placeholder="Added field label" defaultValue={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].addedFieldLabel} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "addedFieldLabel", value: event.target.value, pageIndex: propertyToEdit.page})}  />
                                                </div>
                                            }

                                            <div className={styles.editFieldDivs}>
                                                <label>Required</label>
                                                <Switch 
                                                onChange={() => {
                                                    if (newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].required) {
                                                        updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "required", value: false, pageIndex: propertyToEdit.page})
                                                    } else {
                                                        updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "required", value: true, pageIndex: propertyToEdit.page})
                                                    }
                                                }}
                                                 checked={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].required} />
                                            </div>

                                                {
                                                    (propertyToEdit.fieldType === "textBlock") && <div className={styles.editFieldDivs}>
                                                    <label>Text</label>
                                                    <QuillEditor
                                                        value={content}
                                                        onChange={handleEditorChange}
                                                        
                                                        modules={quillModules}
                                                        formats={quillFormats}
                                                        className="w-full h-[70%] mt-10 bg-white"
                                                    />
                                                </div>
                                                }

                                                


                                            {
                                                (propertyToEdit.fieldType === "shortText" || propertyToEdit.fieldType === "longText") && 
                                                <div className={styles.editFieldDivs}>
                                                    <label>Max Length</label>
                                                    <input type="number" placeholder="Max length" defaultValue={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].maxLength} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "maxLength", value: Number(event.target.value), pageIndex: propertyToEdit.page})}  />
                                                </div>
                                            }

                                            {
                                                (propertyToEdit.fieldType === "file") && 
                                                <div className={styles.editFieldDivs}>
                                                    <label>Max Files Allowed</label>
                                                    <input type="number" placeholder="Maximum number of files" defaultValue={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].maxAllowedFiles} onChange={(event) => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "maxAllowedFiles", value: Number(event.target.value), pageIndex: propertyToEdit.page})}  />
                                                </div>
                                            }

                                            {
                                                ( propertyToEdit.fieldType === "file") && <div className={styles.editFieldDivs}>
                                                    <label>Select previously uploaded files</label>
                                                    <Switch 
                                                    onChange={() => {
                                                        if (newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].allowSelectPreviouslyUploadedFile) {
                                                            updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "allowSelectPreviouslyUploadedFile", value: false, pageIndex: propertyToEdit.page})
                                                        } else {
                                                            updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "allowSelectPreviouslyUploadedFile", value: true, pageIndex: propertyToEdit.page})
                                                        }
                                                    }}
                                                    checked={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].allowSelectPreviouslyUploadedFile} />
                                                </div>
                                            }

                                            {
                                                ( propertyToEdit.fieldType === "file") && <div className={styles.editFieldDivs}>
                                                    <label>Is a certificate/permit</label>
                                                    <Switch
                                                    onChange={() => {
                                                        if (newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].isACertificate) {
                                                            updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "isACertificate", value: false, pageIndex: propertyToEdit.page})
                                                        } else {
                                                            updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "isACertificate", value: true, pageIndex: propertyToEdit.page})
                                                        }
                                                    }}
                                                    checked={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].isACertificate} />
                                                </div>
                                            }

                                            {
                                                ( propertyToEdit.fieldType === "file" && newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].isACertificate) && <div className={styles.editFieldDivs}>
                                                    <label>Has expiry date</label>
                                                    <Switch
                                                    onChange={() => {
                                                        if (newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].hasExpiryDate) {
                                                            updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "hasExpiryDate", value: false, pageIndex: propertyToEdit.page})
                                                        } else {
                                                            updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "hasExpiryDate", value: true, pageIndex: propertyToEdit.page})
                                                        }
                                                    }}
                                                    checked={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].hasExpiryDate} />
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
                                                            <input type="checkbox" checked={newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].allowedFormats.includes(item)} onClick={(event) => {
                                                                let isChecked = newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].allowedFormats.includes(item)

                                                                if (!isChecked) {
                                                                    addAllowedFormat({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "allowedFormats", value: item, pageIndex: propertyToEdit.page})
                                                                } else {
                                                                    removeAllowedFormat({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "allowedFormats", value: item, pageIndex: propertyToEdit.page})
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
                                                    <select onChange={event => updateFieldSettings({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "textType", value: event.target.value, pageIndex: propertyToEdit.page})}>
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
                                                            newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields[propertyToEdit.fieldIndex].options.map((optionItem, optionIndex) => <div key={optionIndex} className={styles.optionItem}>
                                                                <label>{optionItem.label}</label>
                                                                <Image src={removeIcon} alt="remove option" style={{width: "15px", height: "15px"}} onClick={() => removeOptionFromField({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "textType", optionIndex, pageIndex: propertyToEdit.page})} />
                                                            </div>)
                                                        }

                                                        

                                                        <div className={styles.addOptionDiv}>
                                                            <form onSubmit={event => {
                                                                event.preventDefault()
                                                                const newOptionValue = event.target[0].value

                                                                addOptionToField({sectionIndex: propertyToEdit.index, fieldIndex: propertyToEdit.fieldIndex, propertyToEdit: "textType", value: newOptionValue, pageIndex: propertyToEdit.page})
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
                                                    newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields.length > 1 && <>
                                                        {
                                                            propertyToEdit.fieldIndex !== 0 && <div onClick={() => moveFieldInSection({sectionIndex: propertyToEdit.index, currentFieldIndex: propertyToEdit.fieldIndex, newFieldIndex: propertyToEdit.fieldIndex - 1, pageIndex: propertyToEdit.page})}>
                                                                <Image src={upRoundIcon} alt="move field up" />
                                                                <label>Move Up</label>
                                                            </div>
                                                        }

                                                        {
                                                            propertyToEdit.fieldIndex !== newForm.pages[propertyToEdit.page].sections[propertyToEdit.index].fields.length - 1 && <div onClick={() => moveFieldInSection({sectionIndex: propertyToEdit.index, currentFieldIndex: propertyToEdit.fieldIndex, newFieldIndex: propertyToEdit.fieldIndex + 1, pageIndex: propertyToEdit.page})}>
                                                                <Image src={downRoundIcon} alt="move field down" />
                                                                <label>Move Down</label>
                                                            </div>
                                                        }

                                                        
                                                    </>
                                                }

                                                <div onClick={() => removeField(propertyToEdit.index, propertyToEdit.fieldIndex, propertyToEdit.page)}>
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

                                <div onClick={() => addFieldToSection("textBlock")}>
                                    <Image src={parapgraphIcon} alt="text block icon  " style={{width: "100px", height: "50px", marginBottom: "20px"}} />
                                    <label>Text Block</label>
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
                            <label>Is Contractor Application Form</label>

                            <Switch
                                onChange={() => {
                                    if (newForm.settings.isContractorApplicationForm) {
                                        updateFormSettings("isContractorApplicationForm", false)
                                    } else {
                                        updateFormSettings("isContractorApplicationForm", true)
                                    }
                                }}
                                checked={newForm.settings.isContractorApplicationForm} 
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

export default EditForm
