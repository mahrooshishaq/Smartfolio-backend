import { Module } from '@nestjs/common';
import { PythonBridgeService } from './python-bridge.service';

@Module({
  providers: [PythonBridgeService],
  exports: [PythonBridgeService],
})
export class PythonBridgeModule {}
