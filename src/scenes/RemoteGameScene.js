/* 方案2第一阶段：远程 GameScene 入口。
   先复用现有远程渲染逻辑，后续逐步替换为真实实体类映射。
   GuestScene 保留作为回退入口。 */
class RemoteGameScene extends GuestScene {
  constructor() {
    super('RemoteGame');
  }
}
