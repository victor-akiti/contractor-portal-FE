const TextBlock = ({onClick, text}) => {
    return (
        <div onClick={(event) => {
            event.stopPropagation()
            onClick()
        }} >

            <div dangerouslySetInnerHTML={{ __html: text}}>

            </div>

            {!text && <p>This is some text</p>}
            
        </div>
    )
}

export default TextBlock