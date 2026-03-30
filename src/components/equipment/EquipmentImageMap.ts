import xrayMachine from '@/assets/equipment/xray-machine.png';
import ultrasound from '@/assets/equipment/ultrasound.png';
import mriScanner from '@/assets/equipment/mri-scanner.png';
import ctScan from '@/assets/equipment/ct-scan.png';
import ventilator from '@/assets/equipment/ventilator.png';
import defibrillator from '@/assets/equipment/defibrillator.png';
import patientMonitor from '@/assets/equipment/patient-monitor.png';
import ecgMachine from '@/assets/equipment/ecg-machine.png';

const equipmentImages = [
  xrayMachine,
  ultrasound,
  mriScanner,
  ctScan,
  ventilator,
  defibrillator,
  patientMonitor,
  ecgMachine,
];

export function getEquipmentImage(index: number): string {
  return equipmentImages[index % equipmentImages.length];
}

export default equipmentImages;
