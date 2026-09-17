import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function RoomType({ selectedRoomType }) {
  return (
    <div>
      <label className="mb-2.5 block text-sm font-medium text-foreground">Room</label>
      <Select onValueChange={(value) => selectedRoomType(value)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a room type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Living Room">Living Room</SelectItem>
          <SelectItem value="Bedroom">Bedroom</SelectItem>
          <SelectItem value="Kitchen">Kitchen</SelectItem>
          <SelectItem value="Bathroom">Bathroom</SelectItem>
          <SelectItem value="Office">Office</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default RoomType;
