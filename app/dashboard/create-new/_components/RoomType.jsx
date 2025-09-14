import React from "react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function RoomType({ selectedRoomType }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.label 
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        Select Room Type
      </motion.label>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Select onValueChange={(value) => selectedRoomType(value)}>
          <SelectTrigger className="w-full border-purple-300 dark:border-purple-600 focus:ring-purple-500 focus:border-purple-500">
            <SelectValue placeholder="Room Type" />
          </SelectTrigger>
        <SelectContent>
          <SelectItem value="Living Room">Living Room</SelectItem>
          <SelectItem value="Bedroom">Bedroom</SelectItem>
          <SelectItem value="Kitchen">Kitchen</SelectItem>
          <SelectItem value="Bathroom">Bathroom</SelectItem>
          <SelectItem value="Office">Office</SelectItem>
        </SelectContent>
      </Select>
      </motion.div>
    </motion.div>
  );
}

export default RoomType;
