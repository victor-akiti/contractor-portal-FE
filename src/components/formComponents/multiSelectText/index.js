'use client'

import Image from "next/image"
import styles from "./styles/styles.module.css"
import closeIcon from "@/assets/images/remove.svg"
import { useState, useEffect, useRef } from "react"
import InfoText from "@/components/infoText"
import FormErrorText from "@/components/formErrorText"
import { on } from "events"

const MultiSelectText = ({onClick, label,  highlighted, preSelectedOptions, infoText, errorText, required, onChange}) => {
    const [selectedOptions, setSelectedOptions] = useState([])

    const [fixedSelectedOptions, setFixedSelectedOptions] = useState([])

    const multiselectInputTextRef = useRef(null)

    useEffect(() => {
        let tempSelectedOptions = [...fixedSelectedOptions]
        tempSelectedOptions = preSelectedOptions.concat(tempSelectedOptions)
        setSelectedOptions(tempSelectedOptions)
    }, [])

    const removeSelectedOption = option => {
        let tempSelectedOptions = [...selectedOptions]
        tempSelectedOptions = tempSelectedOptions.filter(item => item.value !== option.value)
        setSelectedOptions(tempSelectedOptions)

        tempSelectedOptions = [...fixedSelectedOptions]
        tempSelectedOptions = tempSelectedOptions.filter(item => item.value !== option.value)
        setFixedSelectedOptions(tempSelectedOptions)

        onChange(tempSelectedOptions)

        if (option.isPreselected) {
            
        }

    }

    const addOptionToSelected = event => {
        event.preventDefault()

        const selectedOptionValue = event.target[0].value
        let tempSelectedOptions = [...selectedOptions]
        tempSelectedOptions.push({
            label: selectedOptionValue,
            value: selectedOptionValue,
            required: false,
            isPreselected: false
        })
        setSelectedOptions(tempSelectedOptions)

        tempSelectedOptions = [...fixedSelectedOptions]
        tempSelectedOptions.push({
            label: selectedOptionValue,
            value: selectedOptionValue,
            required: false
        })
        setFixedSelectedOptions(tempSelectedOptions)
        multiselectInputTextRef.current.value = ""

        onChange(tempSelectedOptions)

    }

    return (
        <div className={[styles.multiSelectText, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}{required && <label className={styles.requiredIcon}>*</label>}</label>
            
            <div className={styles.multiSelectContainer}>
                {
                    selectedOptions.map((item, index) => <div key={index} className={styles.multiSelectItem}>
                        <label>{item.value}</label>
                        <Image src={closeIcon} alt="remove option" style={{width: "20px", height: "20px"}} onClick={() => removeSelectedOption(item)} />
                    </div>)
                }

                <form onSubmit={(event) => addOptionToSelected(event)}><input ref={multiselectInputTextRef} placeholder="Enter text and press enter" /></form>
            </div>

            {
                infoText && <InfoText text={infoText} />
            }

            {
                errorText && <FormErrorText text={errorText} />
            }
        </div>
    )
}

export default MultiSelectText