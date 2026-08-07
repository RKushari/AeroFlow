"use client";
import { useState } from "react";
import { GroundEquipment } from "@prisma/client";
import { AddEquipmentForm } from "./AddEquipmentForm";
import { EquipmentList } from "./EquipmentList";

interface EquipmentSectionProps {
  initialEquipment: GroundEquipment[];
}

export function EquipmentSection({ initialEquipment }: EquipmentSectionProps) {
  const [equipment, setEquipment] = useState(initialEquipment);

  // This function adds the new equipment to the TOP of the list
  const handleAddEquipment = (newEquipment: GroundEquipment) => {
    setEquipment((prev) => [newEquipment, ...prev]);
  };

  // This function removes equipment from the list
  const handleDeleteEquipment = (id: string) => {
    setEquipment((prev) => prev.filter((item) => item.id !== id));
  };

  // This function updates equipment in the list
  const handleUpdateEquipment = (updatedEquipment: GroundEquipment) => {
    setEquipment((prev) =>
      prev.map((item) =>
        item.id === updatedEquipment.id ? updatedEquipment : item
      )
    );
  };

  return (
    <>
      <AddEquipmentForm onAdd={handleAddEquipment} />
      <EquipmentList
        equipment={equipment}
        onDelete={handleDeleteEquipment}
        onUpdate={handleUpdateEquipment}
      />
    </>
  );
}