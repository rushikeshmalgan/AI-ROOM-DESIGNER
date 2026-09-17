import React, { useState } from 'react'
import { Textarea } from "@/components/ui/textarea"

function AdditionalReq({ additionalRequirementInput }) {   // receive prop
  const [text, setText] = useState("")

  const handleChange = (e) => {
    setText(e.target.value)
    additionalRequirementInput(e.target.value)
  }

  return (
    <div>
      <label className="mb-2.5 block text-sm font-medium text-foreground">
        Prompt <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <Textarea
        className="resize-none"
        rows={3}
        value={text}
        onChange={handleChange}
        placeholder="Describe how you want to transform this room… e.g. &ldquo;Replace the sofa with a beige sectional&rdquo;"
      />
    </div>
  )
}

export default AdditionalReq
