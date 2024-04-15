'use client'

import Image from "next/image"
import styles from "./styles/styles.module.css"
import closeIcon from "@/assets/images/remove.svg"
import { useState, useEffect, useRef } from "react"

const MultiSelectText = ({onClick, label,  placeholder, type, highlighted, preSelectedOptions}) => {
    const [selectedOptions, setSelectedOptions] = useState([{
        label: "Option 1", 
        value: "Option 1",
        required: false,
        isPreselected: false
    }])

    const [fixedSelectedOptions, setFixedSelectedOptions] = useState([{
        label: "Option 1", 
        value: "Option 1",
        required: false,
        isPreselected: false
    }])

    const multiselectInputTextRef = useRef(null)

    useEffect(() => {
        let tempSelectedOptions = [...fixedSelectedOptions]
        tempSelectedOptions = preSelectedOptions.concat(tempSelectedOptions)
        setSelectedOptions(tempSelectedOptions)
    }, [preSelectedOptions])

    const removeSelectedOption = option => {
        let tempSelectedOptions = [...selectedOptions]
        tempSelectedOptions = tempSelectedOptions.filter(item => item.value !== option.value)
        setSelectedOptions(tempSelectedOptions)

        tempSelectedOptions = [...fixedSelectedOptions]
        tempSelectedOptions = tempSelectedOptions.filter(item => item.value !== option.value)
        setFixedSelectedOptions(tempSelectedOptions)

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

    }

    return (
        <div className={[styles.multiSelectText, highlighted && styles.highlighted].join(" ")} onClick={(event) => {
            event.stopPropagation()
            onClick()
        }}>
            <label>{label}</label>
            
            <div className={styles.multiSelectContainer}>
                {
                    selectedOptions.map((item, index) => <div key={index} className={styles.multiSelectItem}>
                        <label>{item.value}</label>
                        <Image src={closeIcon} alt="remove option" style={{width: "20px", height: "20px"}} onClick={() => removeSelectedOption(item)} />
                    </div>)
                }

                <form onSubmit={(event) => addOptionToSelected(event)}><input ref={multiselectInputTextRef} placeholder="Enter some text and press enter" /></form>
            </div>
        </div>
    )
}

export default MultiSelectText