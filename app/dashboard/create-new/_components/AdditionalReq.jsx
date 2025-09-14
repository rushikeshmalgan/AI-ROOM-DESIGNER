import React, { useState } from 'react'
import { Textarea } from "@/components/ui/textarea"
import { motion } from "framer-motion"

function AdditionalReq({ additionalRequirementInput }) {   // receive prop
  const [text, setText] = useState("")

  const handleChange = (e) => {
    setText(e.target.value)                  // update local state
    additionalRequirementInput(e.target.value)  // call parent handler
    console.log(e.target.value)              // log in console
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <motion.label 
        className='text-grey-400 block mb-2'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        Enter Additional Requirements (Optional)
      </motion.label>
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Textarea 
          className="mt-2 border-purple-300 dark:border-purple-600 focus:ring-purple-500 focus:border-purple-500" 
          value={text}
          onChange={handleChange}
          placeholder="E.g., I want a minimalist design with plants and natural light"
        />
      </motion.div>
    </motion.div>
  )
}

export default AdditionalReq
